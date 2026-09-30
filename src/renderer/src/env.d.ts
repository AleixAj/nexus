// allow CSS custom properties (--acc) in inline styles
declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined
  }
}

export {}
