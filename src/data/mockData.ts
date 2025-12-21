import { Database, DatabaseGroup, Flashcard, Statistics } from "@/types";

export const mockDatabases: Database[] = [
  {
    id: "db-1",
    name: "Filosofía Antigua",
    icon: "📚",
    cardCount: 45,
    lastSynced: new Date(Date.now() - 1000 * 60 * 30),
    source: "notion",
  },
  {
    id: "db-2",
    name: "Machine Learning",
    icon: "🤖",
    cardCount: 128,
    lastSynced: new Date(Date.now() - 1000 * 60 * 60 * 2),
    source: "notion",
  },
  {
    id: "db-3",
    name: "Historia del Arte",
    icon: "🎨",
    cardCount: 67,
    lastSynced: new Date(Date.now() - 1000 * 60 * 60 * 24),
    source: "notion",
  },
  {
    id: "db-4",
    name: "Vocabulario Alemán",
    icon: "🇩🇪",
    cardCount: 234,
    lastSynced: new Date(Date.now() - 1000 * 60 * 15),
    source: "notion",
  },
];

export const mockGroups: DatabaseGroup[] = [
  {
    id: "group-1",
    name: "Humanidades",
    databaseIds: ["db-1", "db-3"],
    color: "#8B5CF6",
  },
  {
    id: "group-2",
    name: "Tecnología",
    databaseIds: ["db-2"],
    color: "#10B981",
  },
];

export const mockFlashcards: Flashcard[] = [
  {
    id: "card-1",
    title: "¿Qué es el Imperativo Categórico de Kant?",
    content: "El imperativo categórico es el principio moral central en la ética de Kant. Establece que debemos actuar solo según aquella máxima por la cual podamos querer al mismo tiempo que se convierta en ley universal.\n\nFormulaciones principales:\n1. Fórmula de la ley universal: Actúa solo según aquella máxima que puedas querer que se convierta en ley universal.\n2. Fórmula de la humanidad: Trata a la humanidad, tanto en tu persona como en la de cualquier otro, siempre como un fin y nunca simplemente como un medio.\n3. Fórmula de la autonomía: La voluntad de todo ser racional como voluntad legisladora universal.",
    state: "tocado",
    lastReviewed: new Date(Date.now() - 1000 * 60 * 60 * 48),
    notes: "Relacionar con la deontología y contrastar con el utilitarismo",
    relatedConcepts: ["Deontología", "Ética formal", "Autonomía moral"],
    databaseId: "db-1",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    viewCount: 5,
  },
  {
    id: "card-2",
    title: "Gradient Descent",
    content: "Gradient Descent es un algoritmo de optimización utilizado para minimizar funciones, especialmente en machine learning para entrenar modelos.\n\nFuncionamiento básico:\n1. Inicializar parámetros aleatoriamente\n2. Calcular el gradiente de la función de pérdida\n3. Actualizar parámetros en dirección opuesta al gradiente\n4. Repetir hasta convergencia\n\nVariantes:\n- Batch Gradient Descent: usa todo el dataset\n- Stochastic Gradient Descent (SGD): usa una muestra\n- Mini-batch: usa lotes pequeños\n\nHiperparámetros clave: learning rate, momentum, número de iteraciones.",
    state: "verde",
    lastReviewed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    notes: "Importante para entender backpropagation",
    relatedConcepts: ["Backpropagation", "Learning Rate", "Optimización"],
    databaseId: "db-2",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
    viewCount: 12,
  },
  {
    id: "card-3",
    title: "El Renacimiento Italiano",
    content: "El Renacimiento italiano fue un período de florecimiento cultural entre los siglos XIV y XVII, originado en Florencia.\n\nCaracterísticas principales:\n- Humanismo: el ser humano como centro\n- Recuperación de la antigüedad clásica\n- Desarrollo de la perspectiva lineal\n- Mecenazgo de familias como los Medici\n\nArtistas destacados:\n- Leonardo da Vinci (1452-1519)\n- Miguel Ángel (1475-1564)\n- Rafael (1483-1520)\n- Botticelli (1445-1510)\n\nCentros principales: Florencia, Roma, Venecia",
    state: "solido",
    lastReviewed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    notes: "",
    relatedConcepts: ["Humanismo", "Perspectiva", "Mecenazgo"],
    databaseId: "db-3",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90),
    viewCount: 20,
  },
  {
    id: "card-4",
    title: "La Alegoría de la Caverna",
    content: "La Alegoría de la Caverna es una metáfora filosófica presentada por Platón en La República (Libro VII).\n\nElementos de la alegoría:\n- Prisioneros encadenados mirando sombras en la pared\n- Fuego que proyecta sombras de objetos\n- Un prisionero liberado que asciende hacia la luz\n- El sol como símbolo del Bien y la verdad\n\nInterpretación:\n- Las sombras representan el mundo sensible (apariencias)\n- El exterior de la caverna es el mundo inteligible (Ideas)\n- El ascenso es la educación filosófica\n- El filósofo tiene el deber de volver para liberar a otros",
    state: "tocado",
    lastReviewed: null,
    notes: "Fundamental para entender la teoría de las Ideas",
    relatedConcepts: ["Teoría de las Ideas", "Epistemología", "Mundo sensible"],
    databaseId: "db-1",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
    viewCount: 2,
  },
];

export const getStatsForDatabase = (databaseId: string): Statistics => {
  const cards = mockFlashcards.filter(c => c.databaseId === databaseId);
  return {
    tocado: cards.filter(c => c.state === 'tocado').length,
    verde: cards.filter(c => c.state === 'verde').length,
    solido: cards.filter(c => c.state === 'solido').length,
    total: cards.length,
  };
};

export const getOverallStats = (): Statistics => {
  return {
    tocado: mockFlashcards.filter(c => c.state === 'tocado').length,
    verde: mockFlashcards.filter(c => c.state === 'verde').length,
    solido: mockFlashcards.filter(c => c.state === 'solido').length,
    total: mockFlashcards.length,
  };
};
