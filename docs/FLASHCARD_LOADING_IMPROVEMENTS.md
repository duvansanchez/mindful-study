# Mejoras pendientes: carga de flashcards

Análisis del proceso actual en `src/hooks/useNotion.ts` → `useMultipleNotionFlashcards`.

---

## 1. Caché no aprovechado (impacto: alto)

**Problema:** El hook usa `useState + useEffect` manual en lugar de TanStack Query. Cada vez que el usuario abre una agrupación para estudiar, recarga todas las flashcards desde el servidor aunque las haya cargado hace 30 segundos.

**Solución:** Reemplazar el `useEffect` manual por múltiples `useQuery` paralelos (uno por `databaseId`), aprovechando el `staleTime` ya configurado en `useNotionFlashcards` (2 minutos). La primera carga sería igual, pero todas las siguientes dentro de la misma sesión serían instantáneas desde caché.

```ts
// Concepto: en lugar de useEffect manual, usar useQueries
import { useQueries } from '@tanstack/react-query';

const results = useQueries({
  queries: databaseIds.map(id => ({
    queryKey: ['notion-flashcards', id],
    queryFn: () => NotionService.getFlashcardsFromDatabase(id),
    staleTime: 2 * 60 * 1000,
  })),
});
```

---

## 2. Inestabilidad del array `databaseIds` (impacto: medio-alto)

**Problema:** El `useEffect` depende de `databaseIds` (un array). Si el componente padre recrea ese array en cada render (aunque tenga los mismos IDs), el efecto se dispara de nuevo y recarga todo innecesariamente. Es un bug silencioso clásico de React.

**Solución:** En el componente que llama al hook, estabilizar el array con `useMemo`:

```ts
const stableDatabaseIds = useMemo(() => group.databaseIds, [group.id]);
const { flashcards } = useMultipleNotionFlashcards(stableDatabaseIds);
```

O alternativamente, dentro del hook, serializar el array para compararlo:

```ts
useEffect(() => {
  // ...
}, [databaseIds.join(',')]); // comparar por valor, no por referencia
```

---

## 3. Fallo total cuando una base de datos falla (impacto: confiabilidad)

**Problema:** Se usa `Promise.all`, lo que significa que si una de 3 bases de datos responde con error, se pierden los datos de las otras dos y el usuario ve pantalla vacía.

**Solución:** Usar `Promise.allSettled` para cargar lo que esté disponible y reportar solo los errores parciales:

```ts
const results = await Promise.allSettled(
  databaseIds.map(id => NotionService.getFlashcardsFromDatabase(id))
);

const combined = results
  .filter(r => r.status === 'fulfilled')
  .flatMap(r => (r as PromiseFulfilledResult<Flashcard[]>).value);

const failed = results.filter(r => r.status === 'rejected').length;
if (failed > 0) {
  toast.warning(`${failed} base(s) de datos no pudieron cargarse`);
}
```

---

## 4. Deduplicación O(n²) (impacto: bajo)

**Problema:** El `findIndex` dentro de `filter` es cuadrático — evalúa cada elemento contra todos los anteriores.

**Solución:** Usar un `Set` de IDs, que es O(n):

```ts
const seen = new Set<string>();
const uniqueFlashcards = combined.filter(f => {
  if (seen.has(f.id)) return false;
  seen.add(f.id);
  return true;
});
```

---

## Prioridad de implementación sugerida

| # | Mejora | Impacto | Complejidad |
|---|--------|---------|-------------|
| 1 | Migrar a `useQueries` con caché | Alto | Media |
| 2 | Estabilizar `databaseIds` con `useMemo` | Medio-Alto | Baja |
| 3 | `Promise.allSettled` para fallos parciales | Confiabilidad | Baja |
| 4 | Deduplicación con `Set` | Bajo | Muy baja |
