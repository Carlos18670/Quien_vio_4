# ¿Quién lo vio? — estructura modular inicial

- `pages/`: una página HTML independiente por pantalla.
- `css/global.css`: estilos compartidos y diseño adaptable.
- `js/pages/`: un módulo JavaScript por pantalla.
- `js/`: configuración, autenticación, cliente de base de datos y utilidades compartidas.
- `components/`: componentes visuales reutilizables.

## Ejecutar
Abre la carpeta en VS Code y usa Live Server desde `index.html`.

## Estado
Esta entrega organiza las pantallas y establece la línea visual según el diseño de referencia. Los formularios de acceso son solo estructura visual; la autenticación real, la base de datos, las fotografías, los reportes y el tiempo real se conectarán con Supabase en etapas posteriores. No usar con datos reales todavía.
