declare module 'qz-tray' {
  const qz: {
    websocket: { isActive: () => boolean; connect: () => Promise<null> };
    printers: {
      find: (query?: string) => Promise<string | string[]>;
      getDefault: () => Promise<string>;
    };
    configs: { create: (printer: string, options?: object) => unknown };
    print: (config: unknown, data: object[]) => Promise<null>;
  };
  export default qz;
}
