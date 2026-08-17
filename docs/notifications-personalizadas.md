# Notificaciones personalizadas

## Objetivo

Evox PropertyOps mantiene una **bandeja de notificaciones por usuario autenticado** para hacer visibles los cambios operativos importantes sin convertir una alerta en una acción de negocio. Las notificaciones son informativas: no aprueban, rechazan ni modifican gastos.

## Preferencias predeterminadas

| Preferencia | Predeterminada | Eventos cubiertos |
|---|---:|---|
| Propiedades | Activa | Registro y cambios de estado de una propiedad. |
| Tareas | Activa | Nuevas tareas y cambios de estado. |
| Urgentes | Activa | Tareas creadas con prioridad urgente. |
| Evidencias | Desactivada | Nuevas notas, fotos o documentos registrados. |
| Revisión de gastos | Activa | Gastos pendientes de una decisión humana. |
| Decisiones de gasto | Activa | Resultado de una aprobación o rechazo ejecutado manualmente. |

Cada usuario puede cambiar estas preferencias desde el ícono de campana en la barra superior. Las preferencias y los registros se consultan y actualizan por `ownerId`; no se comparten entre cuentas autenticadas.

## Flujo operativo

1. Una mutación de PropertyOps crea o actualiza una entidad operativa.
2. El backend conserva el evento append-only existente y consulta las preferencias del mismo usuario.
3. Si la categoría está habilitada, inserta una notificación en `user_notifications`.
4. El centro de notificaciones muestra hasta treinta registros recientes, permite marcar uno o todos como leídos y ofrece los controles personalizados.

> Para gastos, la alerta de revisión indica que se requiere una decisión humana autenticada. La confirmación escrita, el desafío de sesión de un solo uso y la auditoría siguen siendo obligatorios; una notificación no cambia ese contrato.

## Modelo persistente

| Tabla | Finalidad | Aislamiento |
|---|---|---|
| `notification_preferences` | Un conjunto de interruptores por usuario. | Índice único en `ownerId`. |
| `user_notifications` | Bandeja de entrada con categoría, entidad relacionada, contenido y lectura. | Consultas y mutaciones filtradas por `ownerId`. |

La migración `0004_strange_madame_web.sql` únicamente crea estas dos tablas, sus claves foráneas y sus índices; no modifica ni elimina datos de las entidades operativas existentes.

## Verificación realizada

| Verificación | Resultado |
|---|---|
| Migración de esquema | Aplicada correctamente mediante una operación no destructiva. |
| TypeScript | `pnpm check` completó sin errores. |
| Pruebas unitarias | `pnpm test`: 4 archivos y 15 pruebas aprobadas. |
| Reglas e integración | Cubren preferencias predeterminadas, supresión de categorías, validación de claves, aislamiento entre dos propietarios, creación u omisión de alertas y marcado individual o masivo de lectura. |
| Interfaz | El dashboard carga con el ícono de campana y el centro de preferencias integrado. |

## Límite actual

Esta iteración implementa notificaciones **dentro de la aplicación**. La infraestructura nativa del proyecto puede enviar avisos al propietario del proyecto, pero no representa un canal de entrega individual para cada usuario de Evox, por lo que no se utiliza como sustituto de la bandeja aislada por cuenta.

La cobertura de integración usa un adaptador de almacenamiento simulado inyectado solo durante Vitest. El adaptador aplica filtros selectivos de Drizzle por `ownerId` y `notificationId`. Comprueba que dos usuarios mantienen preferencias separadas; que los flujos de propiedad, tarea, evidencia, gasto pendiente y decisión manual crean u omiten alertas según la preferencia activa; y que el marcado individual o masivo de lectura conserva el aislamiento por propietario. La base persistente se verificó por separado mediante `information_schema`.
