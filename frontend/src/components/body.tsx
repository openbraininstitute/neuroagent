type BodyProps = {
  children?: any;
};

export function Body({ children }: BodyProps) {
  return <main className="flex-1 flex flex-col justify-start">{children}</main>;
}
