import electronLogo from './assets/electron.svg'
import { Button } from './components/ui/button'
import { useEffect, useState } from 'react';
import { Progress } from './components/ui/progress';
import { toast, Toaster } from './components/ui/toast';


function App(): React.JSX.Element {
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const cleanup = (window as any).api.onDownloadProgress((data) => {
      setProgress(data.percentage);
    });

    // Cleanup on unmount
    return cleanup;
  }, []);



  useEffect(() => {
    if (progress === 100) {
      setIsDownloading(false);
      showToast("Download successful");
    }
  }, [progress]);


  const showToast = (message: string) => {
    toast.add({
      description: message,
    })
  }

  async function handlePickAndExtract() {
    console.log('Opening file picker...')
    const filePath = await (window as any).api.openFilePicker()

    if (!filePath) {
      console.log('User canceled file selection')
      return
    }

    const extractedText = await (window as any).api.extractPdfText(filePath)
    console.log('Extracted PDF Content:\n', extractedText)
  }

  async function startDownload() {
    setIsDownloading(true);
    setProgress(0);

    try {
            showToast("Download started");

      const url = "https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf";

      // Call the exposed backend function

      await (window as any).api.downloadModel(url, "qwen-7b.gguf");
    } catch (error) {
      console.error("Download failed:", error);
      showToast("Download failed");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="actions">
        <div className="flex flex-col gap-4">
          <Button onClick={handlePickAndExtract}>Extract PDF Text</Button>
          <Button onClick={startDownload}>Download</Button>
          {isDownloading &&
            <div className="flex flex-col">
              <Progress value={progress} className="w-full"></Progress>
              <p>Download Progress: {progress}%</p>
            </div>}
        </div>
      </div>
      <Toaster/>
    </>
  )
}

export default App
