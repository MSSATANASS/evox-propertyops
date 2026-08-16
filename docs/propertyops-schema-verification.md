# Verificación de esquema persistente — Evox PropertyOps

La migración `0001_massive_sharon_carter.sql` fue generada desde `drizzle/schema.ts` y aplicada a MySQL. El 16 de agosto de 2026 se consultó `information_schema` con agregaciones por tabla para comparar columnas, índices y claves foráneas sin truncamiento.

| Tabla | Columnas verificadas | Índices y relaciones verificadas | Resultado |
|---|---:|---|---|
| `properties` | 8 | PK, índice de propietario/actualización, `ownerId → users.id` | Coincide |
| `property_tasks` | 10 | PK, índices por propietario/propiedad y propietario/estado, FKs hacia usuario y propiedad | Coincide |
| `task_evidence` | 7 | PK, índice por propietario/tarea, FKs hacia usuario y tarea | Coincide |
| `property_expenses` | 11 | PK, índices por propietario/propiedad y propietario/estado, FKs hacia usuario, propiedad, tarea y decisor | Coincide |
| `activity_events` | 9 | PK, índice por propietario/propiedad/fecha, FKs hacia propietario, actor y propiedad | Coincide |

Los enums persistentes confirmados son los definidos en Drizzle: estado operativo de propiedad, prioridad y estado de tarea, tipo de evidencia, estado de gasto y tipo de entidad auditada. No se detectaron columnas, índices o relaciones ausentes durante la comparación.

La verificación no inserta ni modifica datos operativos. La aplicación mantiene además filtros explícitos por `ownerId` en todas sus lecturas y mutaciones de dominio.

Como endurecimiento adicional para decisiones de gasto se verificó la tabla `expense_decision_challenges`. Sus nueve columnas, el nonce único, el hash obligatorio de sesión, el índice compuesto por propietario/gasto y las relaciones hacia `users` y `property_expenses` coinciden con las migraciones `0002_true_baron_zemo.sql` y `0003_premium_lester.sql`. Cada desafío vence en cinco minutos, solo puede consumirse una vez y se rechaza si no coincide con la sesión OAuth que lo emitió.
