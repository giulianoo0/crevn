import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      closeButton={false}
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast w-fit rounded-full border border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-2 py-2.5 text-[var(--foreground)] shadow-[0_16px_40px_rgba(0,0,0,0.36)] backdrop-blur-xl",
          title: "w-full text-center text-[13px] font-medium text-[var(--foreground)]",
          description: "w-full text-center text-[12px] text-[var(--muted-foreground)]",
          content: "items-center justify-center gap-0",
          icon: "hidden",
          closeButton: "hidden",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
