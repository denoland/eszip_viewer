import EszipTool from "../islands/EszipTool.tsx";

export default function Home() {
  return (
    <div class="h-screen flex flex-col">
      <header class="p-4 font-bold border-b text-2xl flex gap-4">
        <img src="/logo.svg" class="w-8 h-8" />
        <h1>ESZIP Tools</h1>
      </header>
      <EszipTool />
    </div>
  );
}
