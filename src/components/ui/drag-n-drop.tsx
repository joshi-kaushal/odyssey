"use client";

import {
  ReactNode,
  RefObject,
  useCallback,
} from "react";

import { Accept, FileRejection, useDropzone } from "react-dropzone";
import { toast } from "sonner";

interface DragAndDropProps {
  multiple?: boolean;
  accept?: Accept;
  onChange?: Function;
  maxSize?: number;
  name: string;
  formRef: RefObject<HTMLFormElement>;
  children?: ReactNode;
}

export default function DragAndDrop({
  children,
  multiple,
  accept,
  maxSize,
  name,
  onChange,
  formRef,
}: DragAndDropProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (acceptedFiles.length === 0) {
        toast.error("Image not uploaded properly");
      }

      fileRejections.length >= 1 &&
        fileRejections.forEach(
          (file: { errors: { code: string; message: any }[] }) => {
            file.errors.forEach((err) => {
              if (err.code === "file-too-large") {
                toast.error("File is larger than 2MB.");
              }

              console.error("File might be larger than 2MB: ", err);
            });
          }
        );

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(acceptedFiles[0]);
      if (formRef.current) {
        const input: HTMLInputElement | null =
          formRef.current.querySelector("input[type=file]");
        if (input) {
          input.files = dataTransfer.files;
        }
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        if (
          event.target &&
          event.target.result &&
          typeof event.target.result === "string"
        ) {
          const fileUrl = event.target.result;
          if (onChange) {
            onChange(fileUrl); // Pass the file URL to the onChange function
          }
        }
      };

      reader.readAsDataURL(acceptedFiles[0]);
    },
    [formRef, onChange]
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
