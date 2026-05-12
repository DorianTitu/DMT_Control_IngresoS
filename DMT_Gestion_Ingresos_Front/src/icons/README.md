# Iconos del Aplicativo

Esta carpeta contiene todos los iconos SVG del aplicativo en formato React.

## Estructura

Cada ícono debe ser un componente React funcional que exporte un SVG.

## Plantilla de Ícono

```tsx
interface IconProps {
  size?: number
  color?: string
  className?: string
}

export const IconName: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* SVG paths aquí */}
  </svg>
)
```

## Iconos Disponibles

- `IconThemeLight.tsx` - Ícono modo claro (sol)
- `IconThemeDark.tsx` - Ícono modo oscuro (luna)
- `IconChevronLeft.tsx` - Flecha izquierda para paginación
- `IconChevronRight.tsx` - Flecha derecha para paginación
- `IconClose.tsx` - Botón cerrar (X)
- *Agrega más según sea necesario*
