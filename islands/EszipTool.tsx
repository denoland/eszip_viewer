import { useEffect, useState } from "preact/hooks";
import { options, Parser } from "$eszip";
import { Head } from "$fresh/runtime.ts";

options.wasmURL = window.location &&
  new URL("/eszip_wasm_bg.wasm", window.location.href);

export default function EszipTool() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div class="flex-grow-1 flex">
      {file ? <Viewer file={file} /> : <Upload onSelect={setFile} />}
    </div>
  );
}

function cancelEvent(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}

function Upload(props: { onSelect: (file: File) => void }) {
  const [isDragging, setIsDragging] = useState(false);

  function onDragStart(event: DragEvent) {
    cancelEvent(event);
    setIsDragging(true);
  }

  function onDragEnd(event: DragEvent) {
    cancelEvent(event);
    setIsDragging(false);
  }

  function onDrop(event: DragEvent) {
    cancelEvent(event);
    setIsDragging(false);
    props.onSelect(event.dataTransfer!.files[0]);
  }

  function onInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    props.onSelect(input.files![0]);
  }

  useEffect(() => {
    async function doIt() {
      const downloadURL = new URLSearchParams(location.search).get(
        "download_from",
      );
      if (!downloadURL) {
        return;
      }

      try {
        setIsDragging(true);
        const resp = await fetch(downloadURL);
        const blob = await resp.blob();
        props.onSelect(new File([blob], "downloaded_archive.eszip"));
      } catch (error) {
        window.alert("Download failed, see console");
        throw error;
      } finally {
        setIsDragging(false);
      }
    }

    doIt();
  }, []);

  return (
    <>
      <Head>
        <link href="global.css" rel="stylesheet" />
      </Head>

      <form class="flex-grow-1 flex">
        <label
          htmlFor="file"
          class={`p-4 border border-dashed m-4 flex-grow-1 flex flex-col items-center justify-center hover:cursor-pointer gap-8 ${
            isDragging && "bg-gray-100"
          }`}
          onDrag={cancelEvent}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={cancelEvent}
          onDragEnter={onDragStart}
          onDragLeave={onDragEnd}
          onDrop={onDrop}
        >
          <svg
            class="text-gray-400 h-12 w-12"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p class="text-gray-400">Drop or upload a ESZIP file to get started.</p>
        </label>
        <input class="hidden" type="file" id="file" onInput={onInput} />
      </form>
    </>
  );
}

function Viewer(props: { file: File }) {
  const [data, setData] = useState<Uint8Array | null>(null);
  const [sources, setSources] = useState<Map<string, string> | null>(null);

  useEffect(() => {
    let cancel = false;
    props.file.arrayBuffer().then((data) => {
      if (!cancel) setData(new Uint8Array(data));
    });
    return () => (cancel = true);
  }, [props.file]);

  useEffect(() => {
    if (!data) return;
    Parser.createInstance().then(async (parser) => {
      const specifiers = await parser.parseBytes(data);
      await parser.load();
      const sources = new Map<string, string>();
      for (const specifier of specifiers.sort()) {
        sources.set(specifier, await parser.getModuleSource(specifier));
      }
      setSources(sources);
    });
  }, [data]);

  if (!data) {
    return <div>Loading file...</div>;
  }

  if (!sources) {
    return <div>Parsing eszip...</div>;
  }

  return <FileViewer sources={sources} />;
}

function FileViewer(props: { sources: Map<string, string> }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  return (
    <div class="flex-grow-1 grid grid-cols-4">
      <ul class="border-r pb-2 overflow-y-auto">
        <li>
          <input
            value={search}
            onInput={(e) => setSearch(e.currentTarget.value)}
            placeholder="Search..."
            class="px-2 py-1 w-full border-b mb-2"
          />
        </li>
        {Array.from(props.sources.keys())
          .filter((s) => s.includes(search))
          .map((specifier) => (
            <li
              class={`px-2 hover:bg-gray-50 cursor-pointer whitespace-nowrap ${
                specifier === selected && "bg-gray-100 font-bold"
              }`}
              onClick={() => setSelected(specifier)}
            >
              {specifier}
            </li>
          ))}
      </ul>
      <div class="col-span-3">
        {selected && <SourceViewer source={props.sources.get(selected)!} />}
      </div>
    </div>
  );
}

function SourceViewer(props: { source: string }) {
  const lines = props.source.split("\n");

  return (
    <pre class="font-mono text-sm p-4">{lines.map(line => <span>{line}</span>)}</pre>
  );
}
