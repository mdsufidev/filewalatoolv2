declare module "qpdf-wasm" {
  type QpdfModuleOptions = {
    locateFile?: (path: string) => string;
    print?: (text: string) => void;
    printErr?: (text: string) => void;
  };

  type QpdfFileSystem = {
    writeFile: (path: string, data: Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
    unlink?: (path: string) => void;
  };

  type QpdfModule = {
    FS: QpdfFileSystem;
    callMain: (args: string[]) => number;
  };

  export default function initQpdf(options?: QpdfModuleOptions): Promise<QpdfModule>;
}
