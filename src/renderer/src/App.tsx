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
      <circle
        cx="12" cy="12" r="9"
        stroke="currentColor" strokeWidth="2"
        strokeDasharray="40" strokeDashoffset="10"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconWave() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 12 Q3.5 6 5 12 Q6.5 18 8 12 Q9.5 6 11 12 Q12.5 18 14 12 Q15.5 6 17 12 Q18.5 18 20 12 Q21.5 6 22 12" />
    </svg>
  )
}

function IconFolder() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
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
    const items: FileItem[] = paths.map((p) => ({
      id: crypto.randomUUID(),
      inputPath: p,
      name: p.split(/[\\/]/).pop()!,
      status: 'pending'
    }))
    setFiles((prev) => [...prev, ...items])
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

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }

  const handleChangeFolder = async () => {
    const folder = await window.api.setOutputFolder()
    if (folder) setOutputFolder(folder)
  }

  const hasFiles = files.length > 0
  const hasCompleted = files.some((f) => f.status === 'done' || f.status === 'error')

  return (
    <div className={styles.app}>
      <div className={`${styles.titlebar} ${isMac ? styles.titlebarMac : ''}`}>
        <div className={styles.titleLeft}>
          <span className={styles.titleDot} />
          <span className={styles.title}>ogg → mp3</span>
        </div>
        {!isMac && (
          <div className={styles.controls}>
            <button className={styles.btnMin} onClick={() => window.api.minimize()} aria-label="Minimize">
              <span />
            </button>
            <button className={styles.btnClose} onClick={() => window.api.close()} aria-label="Close">
              <IconX />
            </button>
          </div>
        )}
      </div>

      {ffmpegOk === false && (
        <div className={styles.ffmpegBanner}>
          <span className={styles.ffmpegDot} />
          <span>
            ffmpeg not found —{' '}
            <code>brew install ffmpeg</code> or <code>winget install ffmpeg</code>
          </span>
        </div>
      )}

      <div
        className={[
          styles.dropzone,
          isDragging ? styles.dropzoneActive : '',
          hasFiles ? styles.dropzoneCompact : ''
        ].join(' ')}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!hasFiles ? (
          <div className={styles.dropContent}>
            <div className={styles.dropIconWrap}>
              <div className={styles.dropIconBg} />
              <div className={styles.dropIconInner}><IconWave /></div>
            </div>
            <p className={styles.dropLabel}>drop .ogg files</p>
            <p className={styles.dropHint}>telegram voice messages</p>
            <div className={styles.dropBadge}>
              <span>→</span>
              <span>mp3 · 192kbps · 44.1kHz</span>
            </div>
          </div>
        ) : (
          <p className={styles.dropLabelSmall}>
            {isDragging ? '↓ release' : '+ drop more'}
          </p>
        )}
      </div>

      {hasFiles && (
        <div className={styles.fileList}>
          {files.map((file) => (
            <div
              key={file.id}
              className={[styles.fileItem, styles[`fileItem_${file.status}`]].join(' ')}
            >
              <div className={styles.fileInner}>
                <div className={styles.fileInfo}>
                  <div className={styles.fileName}>{file.name}</div>
                  {file.status === 'error' && file.error && (
                    <div className={styles.fileError} title={file.error}>
                      {file.error.slice(0, 64)}
                    </div>
                  )}
                </div>

                <div className={styles.fileStatus}>
                  {file.status === 'pending' && (
                    <span className={styles.statusPending}>·</span>
                  )}
                  {file.status === 'processing' && <Spinner />}
                  {file.status === 'done' && (
                    <span className={styles.statusDone}><IconCheck /></span>
                  )}
                  {file.status === 'error' && (
                    <span className={styles.statusError}><IconX /></span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {hasCompleted && (
            <button
              className={styles.btnClear}
              onClick={() => setFiles((p) => p.filter((f) => f.status === 'processing' || f.status === 'pending'))}
            >
              clear done
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
