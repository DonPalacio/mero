# Spec: Rendimiento diario por E.A. en las cajas

## Objetivo

Cada caja (`medios`, feature `boxes`) puede tener una tasa de Efectivo Anual (E.A.) que el usuario
escribe a mano. Cada día la base de datos acredita al saldo de la caja el rendimiento equivalente,
igual que lo hace un banco con rendimiento diario (p. ej. Nu al 9,30 % E.A.).

## Reglas

1. **Tasa diaria:** `(1 + EA/100)^(1/365) − 1`. Con 9,30 % es 0,024366 % diario. No se redondea la
   tasa, solo el monto resultante (2 decimales).
2. **Base:** el saldo de la caja al cierre del día (según la `fecha` de los movimientos). El
   rendimiento acreditado se suma al saldo, así que al día siguiente también rinde (capitalización
   diaria). Si el saldo es 0 o negativo, no hay rendimiento.
3. **Día:** zona horaria `America/Bogota`. El rendimiento del día D se acredita a las 00:05 del día
   siguiente (job `pg_cron`).
4. **Activación:** una caja sin tasa (`null` o 0) no rinde. Al activarla el usuario puede elegir
   una fecha de inicio (no futura); sin fecha, el primer rendimiento es el del día de activación.
   Los días atrasados desde esa fecha se acreditan de una vez.
5. **Quién escribe:** solo la base de datos. El cliente solo puede cambiar `tasa_ea` y
   `rendimiento_desde`; `saldo`, `rendimiento_hasta` y la tabla `rendimientos` no son escribibles.
6. **Historial:** tabla `rendimientos` (una fila por caja y día, única). Solo lectura para el
   usuario dueño (RLS).
7. **Idempotencia:** ejecutar el job dos veces el mismo día no duplica. Un día perdido se recupera
   en la siguiente corrida.
8. **Sin retroactivo por movimientos antiguos:** un movimiento con fecha pasada no recalcula días ya
   acreditados.

## Fuera de alcance

Impuestos o retenciones del banco, tasas variables por tramos y otras monedas.
