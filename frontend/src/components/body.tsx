type BodyProps = {
  children?: any;
}

export function Body({ children }: BodyProps) {
  return (
    <main className="flex-grow">
      {children}
    </main>
  );
}
