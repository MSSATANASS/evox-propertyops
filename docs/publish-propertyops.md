# Publicación de Evox PropertyOps

## Antes de publicar

Abre la vista previa del proyecto, inicia sesión con Manus OAuth y registra una propiedad real solo si cuentas con autorización. Verifica el flujo de tareas, evidencias y gastos. Para una decisión de gasto, la interfaz exige un desafío temporal asociado a la sesión, la palabra de confirmación y deja una entrada de auditoría.

## Publicación

Desde la interfaz de administración del proyecto, selecciona **Publish**. El checkpoint publicable actual es `76b16514`. La plataforma solicitará la confirmación de la configuración de publicación y generará una URL estable. La publicación no requiere usar la instancia x402 existente y no modifica sus datos.

## Después de publicar

Comprueba la URL final con una cuenta autorizada, confirma el inicio de sesión, crea una propiedad de prueba permitida y revisa que los datos de la cuenta no incluyan registros de otra sesión. Para un dominio propio, usa el apartado **Settings → Domains** después de publicar.

## Límites actuales

La primera versión almacena URLs de evidencias. La carga directa de archivos privados a almacenamiento S3 puede incorporarse como siguiente iteración. Las decisiones de gasto no se exponen a ningún flujo de IA; el interlock actual exige sesión OAuth coincidente, nonce de un solo uso, vencimiento, texto de confirmación y evento de auditoría.
