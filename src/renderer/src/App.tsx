import { useState, useEffect, useCallback } from 'react'
import styles from './App.module.css'

type FileStatus = 'pending' | 'processing' | 'done' | 'error'

interface FileItem {
  id: string
  inputPath: string
  name: string
  status: FileStatus
  outputPath?: string
  error?: string
}

function Spinner() {
  return (
    <svg className={styles.spinner} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
  )
}

function IconFolder() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconWave() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 24 Q10 16 12 24 Q14 32 16 24 Q18 16 20 24 Q22 32 24 24 Q26 16 28 24 Q30 32 32 24 Q34 16 36 24 Q38 32 40 24" />
    </svg>
  )
}

function IconDrag() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="9" cy="7" r="1" fill="currentColor" />
      <circle cx="15" cy="7" r="1" fill="currentColor" />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
      <circle cx="9" cy="17" r="1" fill="currentColor" />
      <circle cx="15" cy="17" r="1" fill="currentColor" />
    </svg>
  )
}

export default function App() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [outputFolder, setOutputFolder] = useState('')
  const [ffmpegOk, setFfmpegOk] = useState<boolean | null>(null)
  const isMac = navigator.platform.includes('Mac')

  useEffect(() => {
    window.api.getOutputFolder().then(setOutputFolder)
    window.api.checkFfmpeg().then(setFfmpegOk)

    const unsub = window.api.onConvertStatus((data) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.inputPath === data.filePath
            ? { ...f, status: data.status, outputPath: data.outputPath, error: data.error }
            : f
        )
      )
    })
    return unsub
  }, [])

  const startConversion = useCallback(async (paths: string[]) => {
    const newItems: FileItem[] = paths.map((p) => ({
      id: crypto.randomUUID(),
      inputPath: p,
      name: p.split(/[\\/]/).pop()!,
      status: 'pending'
    }))
    setFiles((prev) => [...prev, ...newItems])
    await window.api.convertFiles(paths)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const paths = Array.from(e.dataTransfer.files)
        .filter((f) => f.name.toLowerCase().endsWith('.ogg'))
        .map((f) => (f as File & { path: string }).path)

      if (paths.length > 0) startConversion(paths)
    },
    [startConversion]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDragOut = (_e: React.DragEvent, outputPath: string) => {
    window.api.startDrag(outputPath)
  }

  const handleChangeFolder = async () => {
    const folder = await window.api.setOutputFolder()
    if (folder) setOutputFolder(folder)
  }

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status === 'processing' || f.status === 'pending'))
  }

  const hasCompleted = files.some((f) => f.status === 'done' || f.status === 'error')
  const hasFiles = files.length > 0

  return (
    <div className={styles.app}>
      {!isMac && (
        <div className={styles.titlebar}>
          <span className={styles.title}>ogg → mp3</span>
          <div className={styles.controls}>
            <button className={styles.btnMin} onClick={() => window.api.minimize()} aria-label="Minimize">
              <span />
            </button>
            <button className={styles.btnClose} onClick={() => window.api.close()} aria-label="Close">
              <IconX />
            </button>
          </div>
        </div>
      )}

      {isMac && (
        <div className={`${styles.titlebar} ${styles.titlebarMac}`}>
          <span className={styles.title}>ogg → mp3</span>
        </div>
      )}

      {ffmpegOk === false && (
        <div className={styles.ffmpegBanner}>
          <span className={styles.ffmpegDot} />
          <span>
            <strong>ffmpeg not found.</strong> Install:{' '}
            <code>brew install ffmpeg</code> or{' '}
            <code>winget install ffmpeg</code>
          </span>
        </div>
      )}

      <div
        className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''} ${hasFiles ? styles.dropzoneCompact : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!hasFiles ? (
          <div className={styles.dropContent}>
            <div className={styles.dropIcon}>
              <IconWave />
            </div>
            <p className={styles.dropLabel}>Drop .ogg files here</p>
            <p className={styles.dropHint}>Telegram voice messages</p>
          </div>
        ) : (
          <p className={styles.dropLabelSmall}>
            {isDragging ? 'Release to add' : '+ Drop more files'}
          </p>
        )}
      </div>

      {hasFiles && (
        <div className={styles.fileList}>
          {files.map((file) => (
            <div
              key={file.id}
              className={`${styles.fileItem} ${styles[`fileItem_${file.status}`]}`}
            >
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{file.name}</span>
                {file.status === 'error' && file.error && (
                  <span className={styles.fileError} title={file.error}>
                    {file.error.slice(0, 60)}
                  </span>
                )}
              </div>

              <div className={styles.fileStatus}>
                {file.status === 'pending' && (
                  <span className={styles.statusPending}>—</span>
                )}
                {file.status === 'processing' && <Spinner />}
                {file.status === 'done' && (
                  <div
                    className={styles.dragHandle}
                    draggable
                    onDragStart={(e) => handleDragOut(e, file.outputPath!)}
                    title="Drag to export file"
                  >
                    <IconCheck />
                    <span className={styles.dragLabel}>drag out</span>
                  </div>
                )}
                {file.status === 'error' && (
                  <span className={styles.statusError}>
                    <IconX />
                  </span>
                )}
              </div>
            </div>
          ))}

          {hasCompleted && (
            <button className={styles.btnClear} onClick={clearCompleted}>
              Clear completed
            </button>
          )}
        </div>
      )}

      <div className={styles.footer}>
        <button
          className={styles.folderPath}
          onClick={() => window.api.openOutputFolder()}
          title="Open output folder"
        >
          <IconFolder />
          <span className={styles.folderText}>{outputFolder || '…'}</span>
        </button>
        <button className={styles.btnChange} onClick={handleChangeFolder}>
          change
        </button>
      </div>
    </div>
  )
}
