/**
 * lib/cache.js — Sistema de Caching Seguro (Server-Side)
 * [CORREGIDO: ELIMINADA PERSISTENCIA GLOBAL BUGGY]
 * 
 * MECANISMO: Usa React.cache() nativo de React/Next.js
 * SCOPE: El cache se limpia automáticamente al finalizar cada solicitud HTTP.
 * BENEFICIO: Evita re-leer el mismo rango del Excel si se solicita múltiples veces 
 *           dentro del mismo flujo de renderizado o API call.
 */

import { cache } from "react";

/**
 * Cache de KPIs por mes
 * React.cache memoriza el resultado basado en los argumentos (year, month)
 * mientras dure la ejecución de la solicitud actual.
 */
export const getCachedKPIs = cache(async (year, month, fetchFn) => {
  // Simplemente ejecutamos el fetch. React se encarga de no repetirlo
  // si los argumentos (year, month) son idénticos en la misma request.
  return await fetchFn();
});

export const getCachedTratamientos = cache(async (year, month, fetchFn) => {
  return await fetchFn();
});

export const getCachedGastos = cache(async (year, month, fetchFn) => {
  return await fetchFn();
});

export const getCachedHeatmap = cache(async (year, month, fetchFn) => {
  return await fetchFn();
});