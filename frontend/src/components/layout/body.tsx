type BodyProps = {
  children?: React.ReactNode;
};

export function Body({ children }: BodyProps) {
  return <main className="flex flex-1 flex-col justify-start">{children}</main>;
}
