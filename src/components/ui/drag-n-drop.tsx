"use client"
import { FC, PropsWithChildren, useCallback } from 'react'

import { Accept, useDropzone } from 'react-dropzone'

const DragAndDrop: FC<PropsWithChildren<{
  className: string
  multiple?: boolean
  accept?: Accept
  onChange: Function
  maxSize?: number
  setFileRejection?: (value: string) => void
}>> = (props) => {
  const { className, children, multiple, accept, maxSize, setFileRejection, onChange } = props

  const onDrop = useCallback((acceptedFiles: any[], fileRejections: any[]) => {
    fileRejections.forEach((file: { errors: { code: string; message: any }[] }) => {
      file.errors.forEach((err) => {
        if (err.code === 'file-too-large') {
          setFileRejection && setFileRejection('File is larger than 2MB.')
        }
      })
    })

    const files = acceptedFiles.map((file) => {
      if (file) {
        file.imageSrc = URL.createObjectURL(file as Blob)
      }
      return file
    })

    onChange(files)
  }, [onChange, setFileRejection])

  const { getInputProps, getRootProps } = useDropzone({
    onDrop,
    multiple,
    accept,
    maxSize
  })

  return <div
    className={className}
    {...getRootProps()}
  >
    <input {...getInputProps()} name="photos" />
    {children || <p>Drag and drop files or select to browse</p>}
  </div>
}

export default DragAndDrop
