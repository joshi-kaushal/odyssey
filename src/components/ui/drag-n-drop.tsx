"use client";
import { FC, PropsWithChildren, ReactNode, useCallback } from "react";

import { Accept, useDropzone } from "react-dropzone";
import { toast } from "sonner";

interface DragAndDropProps {
  multiple?: boolean;
  accept?: Accept;
  onChange: Function;
  maxSize?: number;
  name: string;
  children?: ReactNode;
}

export default function DragAndDrop({
  children,
  multiple,
  accept,
  maxSize,
  name,
  onChange,
}: DragAndDropProps) {
  const onDrop = useCallback(
    (acceptedFiles: any[], fileRejections: any[]) => {
      fileRejections.forEach(
        (file: { errors: { code: string; message: any }[] }) => {
          file.errors.forEach((err) => {
            if (err.code === "file-too-large") {
              toast.error("File is larger than 2MB.");
            }

            console.log(err);
          });
        }
      );

      const files = acceptedFiles.map((file) => {
        if (file) {
          file.imageSrc = URL.createObjectURL(file as Blob);
        }
        return file;
      });
      console.log(files);
      onChange(files);
    },
    [onChange]
  );

  const { getInputProps, getRootProps } = useDropzone({
    onDrop,
    multiple,
    accept,
    maxSize,
  });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} name={name} />
      {children || <p>Drag and drop files or select to browse</p>}
    </div>
  );
}
