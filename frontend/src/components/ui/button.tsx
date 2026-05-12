import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'group/button inline-flex shrink-0 items-center justify-center rounded-md border text-sm font-medium whitespace-nowrap shadow-xs transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        default: 'border-slate-700 bg-slate-700 text-white hover:bg-slate-800',
        outline:
          'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
        secondary:
          'border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200',
        ghost: 'border-transparent text-slate-700 hover:bg-slate-100',
        destructive:
          'border-red-600 bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-300',
        link: 'border-transparent text-slate-700 underline-offset-4 shadow-none hover:underline',
      },
      size: {
        default: 'h-9 gap-2 px-3',
        xs: 'h-7 gap-1.5 px-2 text-xs [&_svg:not([class*=size-])]:size-3',
        sm: 'h-8 gap-1.5 px-3',
        lg: 'h-10 gap-2 px-4',
        icon: 'size-9',
        'icon-xs': 'size-7',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
