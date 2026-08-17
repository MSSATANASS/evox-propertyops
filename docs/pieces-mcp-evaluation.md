# Evaluación de Pieces MCP para el flujo del asistente

## Hallazgos oficiales iniciales

Pieces MCP expone la memoria de largo plazo de PiecesOS a clientes MCP mediante una herramienta de recuperación de contexto. La documentación declara que la memoria captura y almacena localmente contexto como fragmentos de código, historial de navegador, notas y datos de aplicaciones; para utilizar el MCP se requiere instalar PiecesOS y habilitar el motor de memoria de largo plazo.[1]

La integración con GitHub Copilot requiere PiecesOS en ejecución y memoria de largo plazo habilitada. La guía de Windows indica que PiecesOS usa procesamiento de visión para ingerir contexto de aplicaciones en primer plano y ofrece controles de acceso por fuente; también advierte que puede requerir permisos capaces de observar información sensible.[2]

El servidor se publica por un endpoint local HTTP/SSE que suele estar en el puerto `39300`, aunque la documentación indica que el puerto puede variar. La integración con Copilot funciona en modo Agent y agrega costo de contexto por descripciones de herramientas y resultados recuperados.[1] [2] [3]

## Implicación preliminar

La herramienta puede ayudar a un desarrollador humano que trabaja recurrentemente en el mismo equipo y desea recuperar decisiones o depuración histórica en su IDE. No puede instalarse como una memoria universal del asistente en este entorno sin un PiecesOS ejecutándose en el equipo objetivo, y su alcance de captura exige una decisión explícita de privacidad.

## Compatibilidad con este flujo

La configuración activa de esta sesión no contiene un conector Pieces. Aunque se creara uno, el servidor documentado depende de un proceso PiecesOS local y de su endpoint local; el entorno del asistente es efímero y opera en un sandbox distinto del escritorio Windows del usuario. Por ello, conectar este servidor al asistente no daría acceso automático a la memoria del escritorio y requeriría exponer el endpoint local mediante una red o túnel, lo que incrementaría innecesariamente la superficie de datos.

Para el trabajo actual, el asistente ya conserva estado estructurado mediante archivos, historial de tareas, repositorios GitHub, documentación del proyecto, pruebas y conectores específicos. Pieces no sustituiría esas fuentes: añadiría memoria personal de actividad capturada en el equipo del usuario, útil principalmente dentro de su IDE.

## Recomendación final

**No adoptar Pieces MCP para el asistente ni instalarlo en esta fase.** Su propuesta de valor para el asistente es baja porque el sandbox no es persistente ni comparte el mismo proceso local que el escritorio Windows del usuario. Para funcionar aquí habría que exponer PiecesOS por red o túnel, con más configuración, superficie de ataque y riesgo de que contexto sensible capturado por Pieces llegue a un agente remoto.

Sí puede ser una herramienta razonable para el usuario dentro de **VS Code + GitHub Copilot en su propia computadora**, si desea recuperar trabajo histórico de forma personal. En ese caso, se recomienda usar controles de acceso por aplicación, limitar las fuentes capturadas, no exponer su endpoint local fuera del equipo y habilitarlo únicamente durante sesiones de desarrollo donde la memoria histórica compense el costo extra de contexto. No debe tratarse como fuente de verdad de Evox: el repositorio, la base de datos, las migraciones y la documentación versionada siguen siendo las fuentes operativas.

## Fuentes

[1] https://docs.pieces.app/products/mcp

[2] https://docs.pieces.app/products/mcp/github-copilot

[3] https://pieces.app/blog/introducing-the-pieces-mcp-server

[4] https://docs.github.com/en/copilot/concepts/context/mcp
