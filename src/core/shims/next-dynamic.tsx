import React from "react";

type DynamicOptions = {
  loading?: () => React.ReactElement | null;
  ssr?: boolean;
};

export default function dynamic<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options?: DynamicOptions
): React.ComponentType<React.ComponentProps<T>> {
  const LazyComponent = React.lazy(factory);

  const DynamicComponent = (props: React.ComponentProps<T>) => (
    <React.Suspense fallback={options?.loading?.() ?? null}>
      <LazyComponent {...props} />
    </React.Suspense>
  );

  DynamicComponent.displayName = "DynamicComponent";
  return DynamicComponent;
}
