# Verificación funcional de interfaz — Evox PropertyOps

La verificación se ejecutó el 16 de agosto de 2026 sobre el servidor de desarrollo administrado del proyecto, usando una sesión OAuth autenticada. No se insertaron datos de prueba en la cuenta del usuario.

| Escenario | Método reproducible | Resultado |
|---|---|---|
| Escritorio | Abrir `/` con viewport de 1440 × 1000 y sesión autenticada. | El panel lateral, métricas, formulario de propiedad y estado vacío se muestran sin solapamiento. |
| Móvil | Abrir `/` con viewport de 375 × 812 y sesión autenticada. | El panel de propiedades, aviso de control humano, métricas y estado vacío se reordenan en una columna legible. |
| Estado vacío | Usar una cuenta sin propiedades. | Se muestran métricas en cero, formulario de alta y el mensaje de primera propiedad. |
| Estado de carga | Abrir `/?evox-preview=loading` en desarrollo a 1280 × 720. | Se capturó el estado `Inicializando operación…` sin exponer formularios inconsistentes. |
| Estado de error | Abrir `/?evox-preview=error` en desarrollo a 1280 × 720. | Se capturó el mensaje no destructivo y el botón `Reintentar`; no se ejecutan mutaciones. |
| Decisión manual de gasto | Con un gasto pendiente, pulsar Aprobar o Rechazar. | Se genera un desafío temporal por sesión. La confirmación exige escribir `APROBAR` o `RECHAZAR`; el servidor valida propietario, gasto, estado, nonce, vencimiento y uso único antes de registrar la decisión. |

Las pruebas automatizadas complementarias se ejecutaron con `pnpm test`, `pnpm check` y `pnpm build`. El resultado fue de cinco pruebas aprobadas, typecheck correcto y build de producción correcto. Las reglas de seguridad prueban aislamiento de propietario, confirmación literal, append-only, vencimiento, no reutilización, no coincidencia de desafío y rechazo de un desafío procedente de otra sesión.
