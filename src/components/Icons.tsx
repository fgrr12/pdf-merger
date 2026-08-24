import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, className = "h-4 w-4", ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Plus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const FolderPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.6.8L11.8 7H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M12 11v5M9.5 13.5h5" />
  </Icon>
);

export const Folder = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.6.8L11.8 7H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Icon>
);

export const X = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const ChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);

export const ChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 5l7 7-7 7" />
  </Icon>
);

export const Trash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2L18 7" />
  </Icon>
);

export const SortAZ = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h9M4 12h7M4 18h5M17 5v14M17 19l-3-3M17 19l3-3" />
  </Icon>
);

export const Reverse = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4v16M7 4L4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3" />
  </Icon>
);

export const Check = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Icon>
);

export const Alert = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
  </Icon>
);

export const Pages = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 3h6.5L19 7.5V17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M14 3v5h5" />
    <path d="M16 19v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8" opacity=".45" />
  </Icon>
);

/** Marca de la app: dos hojas unidas por una grapa. */
export const Logo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="url(#grapa-bg)" />
    <rect x="8.5" y="8" width="10" height="14" rx="1.6" fill="white" opacity=".55" />
    <rect x="12.5" y="10.5" width="10" height="14" rx="1.6" fill="white" opacity=".92" />
    <path
      d="M11.5 12.5v-1.8a2.2 2.2 0 0 1 4.4 0v6.6"
      stroke="#4c1d95"
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />
    <defs>
      <linearGradient id="grapa-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8b5cf6" />
        <stop offset="1" stopColor="#6d28d9" />
      </linearGradient>
    </defs>
  </svg>
);
