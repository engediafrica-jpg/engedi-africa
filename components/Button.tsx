import Link from 'next/link'
import type { ReactNode, ButtonHTMLAttributes } from 'react'

type Variant = 'solid' | 'outline' | 'ghost'

const variantClasses: Record<Variant, string> = {
  solid: 'bg-text text-surface hover:bg-clay-deep border border-transparent',
  outline: 'bg-transparent text-text border border-line-strong hover:border-text',
  ghost: 'bg-transparent text-text-muted border border-transparent hover:text-text',
}

const base =
  'inline-flex items-center gap-2 rounded-sm px-7 py-3.5 font-display font-semibold text-[0.95rem] no-underline transition-transform transition-colors duration-150 hover:-translate-y-px'

type CommonProps = {
  variant?: Variant
  children: ReactNode
  className?: string
}

type ButtonAsLink = CommonProps & { href: string }
type ButtonAsButton = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined }

export default function Button(props: ButtonAsLink | ButtonAsButton) {
  const { variant = 'solid', children, className = '' } = props
  const classes = `${base} ${variantClasses[variant]} ${className}`

  if ('href' in props && props.href) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    )
  }

  const { href: _href, variant: _v, children: _c, className: _cn, ...rest } = props as ButtonAsButton
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}
