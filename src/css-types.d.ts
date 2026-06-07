// Module augmentation — allows CSS custom properties (--*) in React's style prop.
// The export {} makes this file a module so the declare block is an augmentation,
// not an ambient module that would shadow @types/react.
export {}

declare module 'react' {
    interface CSSProperties {
        [key: `--${string}`]: string | number | undefined
    }
}
