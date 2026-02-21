# Plan de mejora de rendimiento — Carga de flashcards

Análisis basado en inspección real de `server/test-api.cjs`, `src/hooks/useNotion.ts` y `src/services/notion.ts`.

---

## Diagnóstico general

El cuello de botella principal está en el **servidor**, no en el cliente. El frontend ya usa TanStack Query con `staleTime` configurado correctamente. El problema es que el servidor genera miles de llamadas innecesarias a la API de Notion por operaciones normales, lo que agota el rate limit (3 req/seg de Notion) con muy pocos usuarios.

---

## Problemas ordenados por impacto

---

### 1. `notion.search()` en lugar de `notion.databases.query()` — CRÍTICO

**Archivo:** `server/test-api.cjs` línea ~967
**Endpoint afectado:** `GET /databases/:databaseId/flashcards`

**Problema:** Para cargar las flashcards de una base de datos específica, el servidor hace una búsqueda global en todas las páginas de Notion y luego filtra manualmente por `database_id` en memoria:

```js
// ❌ Actual: descarga TODO Notion y filtra en memoria
while (hasMore) {
  const response = await notion.search({
    query: '',
    page_size: 100,
    start_cursor: nextCursor,
    filter: { value: 'page', property: 'object' }
  });
  const pagesInThisDb = response.results.filter(
    page => page.parent.database_id === databaseId
  );
}
```

**Solución:** Usar el endpoint específico de Notion para consultar una base de datos directamente:

```js
// ✅ Correcto: solo descarga las páginas de esa base de datos
while (hasMore) {
  const response = await notion.databases.query({
    database_id: databaseId,
    page_size: 100,
    start_cursor: nextCursor,
  });
  // response.results ya son SOLO las páginas de esa DB
}
```

**Impacto estimado:** Si tienes 500 páginas en Notion y una DB tiene 50 flashcards, el método actual descarga 500 páginas para devolver 50. El método correcto descarga solo 50. **Reducción de llamadas: 90%+ en la primera carga.**

---

### 2. N+1 queries por relaciones — CRÍTICO

**Archivo:** `server/test-api.cjs` línea ~1086
**Endpoint afectado:** `GET /databases/:databaseId/flashcards`

**Problema:** Por cada flashcard que tiene propiedades de tipo `relation`, el servidor hace una llamada extra a `notion.pages.retrieve()` **por cada relación, de forma secuencial dentro de un loop**:

```js
// ❌ Actual: 1 llamada por cada relación, en serie
for (const relation of propValue.relation) {
  const relatedPage = await notion.pages.retrieve({ page_id: relation.id });
  // ...
}
```

Combinado con `Promise.all()` sobre todas las flashcards, esto genera una tormenta de requests: 100 flashcards × 3 relaciones = 300 llamadas simultáneas.

**Solución (corto plazo):** Paralelizar las llamadas dentro de cada flashcard y limitar la concurrencia global:

```js
// ✅ Paralelo dentro de la flashcard
const relatedPages = await Promise.all(
  propValue.relation.map(r => notion.pages.retrieve({ page_id: r.id }))
);
```

**Solución (largo plazo):** Eliminar la carga de relaciones del endpoint de flashcards y hacerla lazy (solo cuando el usuario abre una flashcard específica), ya que no se necesita para mostrar el listado.

**Impacto estimado:** Con 50 flashcards × 3 relaciones = 150 llamadas extra por carga. Eliminarlo del listado inicial reduce esto a 0.

---

### 3. Endpoint de estadísticas hace búsqueda global por cada DB — CRÍTICO

**Archivo:** `server/test-api.cjs` línea ~1932
**Endpoint afectado:** `GET /groups/:groupId/stats`

**Problema:** El endpoint de estadísticas itera sobre todas las bases de datos del grupo y para cada una hace una búsqueda global con `notion.search()`, igual que el problema #1. Con un grupo de 5 bases de datos, hace 5 pasadas completas por todo tu Notion.

Además, tiene una lógica de paginación defectuosa que puede entrar en loop infinito si las páginas de Notion no contienen ninguna página de esa DB en una ronda de 100 resultados.

**Solución:** Reemplazar `notion.search()` por `notion.databases.query()` en este endpoint también, y aprovechar el caché de flashcards ya cargadas en lugar de hacer llamadas independientes para estadísticas.

```js
// ✅ Usar datos ya cacheados o query directo por DB
const response = await notion.databases.query({
  database_id: dbId,
  page_size: 100,
});
```

**Impacto estimado:** Un grupo con 5 DBs pasa de potencialmente 50+ requests a 5 requests.

---

### 4. Carga recursiva de contenido sin límite práctico — GRAVE

**Archivo:** `server/test-api.cjs` línea ~1394
**Endpoint afectado:** `GET /flashcards/:flashcardId/content`

**Problema:** La función `getBlockChildren()` se llama recursivamente para cada bloque anidado, haciendo una llamada a `notion.blocks.children.list()` por cada nivel. Una flashcard con contenido profundo puede generar decenas o cientos de llamadas:

```js
// ❌ Actual: recursión sin control de concurrencia
processedChild.children = await getBlockChildren(child.id, depth + 1);
```

**Solución:**
1. Limitar la profundidad a 2-3 niveles máximo (la mayoría de contenido de flashcards no necesita más)
2. Cargar los hijos en paralelo en lugar de en serie
3. Aumentar el `staleTime` del caché de bloques, ya que el contenido de flashcards cambia raramente

**Impacto estimado:** Reduce de potencialmente 100+ requests a 5-15 por flashcard.

---

### 5. Caché del cliente no aprovechado por `useMultipleNotionFlashcards` — GRAVE

**Archivo:** `src/hooks/useNotion.ts` línea 92

**Problema:** El hook que carga múltiples bases de datos usa `useState + useEffect` manual en lugar de TanStack Query. Esto significa que cada vez que el usuario abre una agrupación, recarga todo desde el servidor aunque los datos estén frescos en caché:

```ts
// ❌ Actual: bypasa el caché de TanStack Query
const [allFlashcards, setAllFlashcards] = useState<Flashcard[]>([]);
useEffect(() => {
  // llama directo al servicio, sin pasar por TanStack Query
  const flashcards = await NotionService.getFlashcardsFromDatabase(dbId);
}, [databaseIds]);
```

**Solución:** Migrar a `useQueries` de TanStack Query, que reutiliza el caché compartido con `useNotionFlashcards`:

```ts
// ✅ Correcto: usa caché compartido, segunda visita es instantánea
import { useQueries } from '@tanstack/react-query';

const results = useQueries({
  queries: databaseIds.map(id => ({
    queryKey: ['notion-flashcards', id],
    queryFn: () => NotionService.getFlashcardsFromDatabase(id),
    staleTime: 5 * 60 * 1000,
  })),
});
```

**Impacto estimado:** Primera carga igual. Todas las visitas siguientes dentro de la sesión son instantáneas (0 requests al servidor).

---

### 6. TTL de caché demasiado corto en el servidor — MODERADO

**Archivo:** `server/test-api.cjs` línea ~939

**Problema:** El caché de flashcards en el servidor expira en 5 minutos (`FLASHCARDS_CACHE_TTL`). Las flashcards de Notion raramente cambian durante una sesión de estudio. Esto genera 12 recargas completas por hora por base de datos.

**Solución:** Aumentar el TTL a 30-60 minutos y forzar invalidación solo cuando el usuario hace una acción de escritura (actualizar estado, marcar repaso).

```js
const FLASHCARDS_CACHE_TTL = 30 * 60 * 1000; // 30 minutos
```

**Impacto estimado:** Reduce las recargas de 12/hora a 2/hora por DB.

---

### 7. Deduplicación O(n²) en `useMultipleNotionFlashcards` — BAJO

**Archivo:** `src/hooks/useNotion.ts` línea 124

**Problema:** El `filter + findIndex` para eliminar duplicados es cuadrático:

```ts
// ❌ O(n²)
const uniqueFlashcards = combined.filter((flashcard, index, self) =>
  index === self.findIndex(f => f.id === flashcard.id)
);
```

**Solución:** Usar un `Set` para deduplicar en O(n):

```ts
// ✅ O(n)
const seen = new Set<string>();
const uniqueFlashcards = combined.filter(f => {
  if (seen.has(f.id)) return false;
  seen.add(f.id);
  return true;
});
```

**Impacto estimado:** Marginal con menos de 1,000 flashcards. Relevante con volúmenes altos.

---

## Prioridad de implementación

| # | Mejora | Archivo | Impacto | Esfuerzo |
|---|--------|---------|---------|----------|
| 1 | `notion.databases.query` en `/flashcards` | server | Crítico | Bajo |
| 2 | `notion.databases.query` en `/stats` | server | Crítico | Bajo |
| 3 | Eliminar relaciones del listado inicial | server | Crítico | Medio |
| 4 | TTL de caché a 30 min en servidor | server | Moderado | Muy bajo |
| 5 | Migrar a `useQueries` en cliente | src/hooks | Grave | Medio |
| 6 | Limitar recursión de contenido | server | Grave | Medio |
| 7 | Deduplicación con `Set` | src/hooks | Bajo | Muy bajo |

**Recomendación:** Implementar #1, #2 y #4 primero — son cambios pequeños con el mayor retorno inmediato.
