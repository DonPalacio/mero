# Spec: Registro de movimientos por voz

## Objetivo
Permitir registrar un ingreso o gasto hablando ("gasté 25 mil en almuerzo con Nequi"), desde cualquier pantalla privada, sin abrir el formulario de Transacciones.

## Flujo
1. Un botón flotante fijo (esquina inferior derecha) aparece en todas las pantallas privadas. No aparece en `/login` ni durante el cierre de sesión.
2. Al pulsarlo se pide permiso de micrófono y se transcribe la voz en el navegador (Web Speech API, `es-CO`). Si el navegador no la soporta, se avisa y se permite escribir el texto.
3. El texto (máx. 300 caracteres) se envía a una server function `POST` que exige sesión válida y llama a `claude-haiku-5-5` con las listas de nombres de categorías y cajas del usuario y la fecha local de hoy. No se envían ids ni saldos.
4. La IA devuelve `{ type, amount, categoryName, boxName, date, note }`. El cliente resuelve los nombres contra sus listas reales (sin tildes ni mayúsculas); lo que no coincide queda sin elegir.
5. Se muestra una tarjeta de confirmación editable. La caja no nombrada se preselecciona con la más usada. Nada se guarda sin confirmación.
6. Al confirmar se usa el mismo flujo de Transacciones: actualización optimista, `createTransaction`, `transactionCreatedConfirmed`; si falla, se revierte y sale `toast.error("No se pudo guardar el movimiento")`.

## Reglas de negocio
- Monto: número > 0, máx. 3 decimales; entiende "mil", "lucas", "k", "palo" (millón).
- Tipo: `expense` o `income`; la categoría debe ser del mismo tipo.
- Fecha: relativa a hoy en hora local ("ayer", "el lunes"); por defecto hoy.
- Categoría opcional; si falta, se avisa que no contará en los totales del dashboard.
- Caja obligatoria para guardar.

## Seguridad
- La clave `ANTHROPIC_API_KEY` solo existe en el servidor (sin prefijo `VITE_`).
- La server function valida sesión con `getClaims()`, valida la entrada con zod y no cambia el CSRF.
- `Permissions-Policy` pasa a `microphone=(self)`; la CSP no cambia.

## Limitaciones conocidas
- **Borrado inmediato de un movimiento dictado.** `useTransactionForm` espera las altas en curso (`pendingInserts`, interno de ese hook) antes de borrar, pero las altas por voz no pasan por ese mapa. Si se borra una fila recién dictada, desde Transacciones, antes de que termine su `INSERT` (décimas de segundo; más con mala conexión), el `DELETE` puede llegar antes y la fila reaparece tras la relectura, con su monto ya sumado a `boxes.balance`. No corrompe datos: se borra de nuevo. Riesgo aceptado el 2026-11-15. Solución futura: que las altas sean `useMutation` con clave por id y que el borrado espere la mutación pendiente.
- La caja sugerida se calcula con los movimientos del mes actual en caché, no con todo el historial.

## Fuera de alcance
Rate limiting, transcripción en navegadores sin Web Speech API, traspasos entre cajas, edición de movimientos existentes por voz.
