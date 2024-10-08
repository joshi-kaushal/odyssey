"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { ActionMeta, MultiValue, SingleValue } from "react-select";

const CreatableSelect = dynamic(() => import("react-select/creatable"), {
  ssr: false,
});

interface Option {
  id?: string;
  value: string;
  label: string;
}

interface MultiSelectProps {
  placeholder?: string;
  options: Option[];
  values?: Option[];
  isMulti?: boolean;
  onCreateOption?: (inputValue: string) => Promise<Option | void>;
  name: string;
  onOptionChange?: (value: any) => void
}

export default function Multiselect({
  name,
  placeholder,
  options = [],
  values = [],
  isMulti = false,
  onCreateOption,
  onOptionChange
}: MultiSelectProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedOptions, setSelectedOptions] = useState<Option[]>(options);
  const [value, setValue] = useState<Option | Option[]>(values);

  const handleCreate = useCallback(async (inputValue: string) => {
    setIsLoading(true);

    if (onCreateOption) {
      const newOption = await onCreateOption(inputValue);
      if (newOption) {
        setSelectedOptions((prev) => [...prev, newOption]);
        isMulti
          ? setValue((prev: Option | Option[]) => (prev && prev instanceof Array ? [...prev, newOption] : [newOption]))
          : setValue(newOption);
      }
    }
    setIsLoading(false);
  }, [onCreateOption, isMulti])

  const handleChange = useCallback((
    newValue: MultiValue<Option> | SingleValue<Option>,
  ) => {
    setValue(newValue as Option | Option[]);
    if (onOptionChange) {
      onOptionChange(newValue as Option);
    }
  }, [onOptionChange]);

  return (
    <CreatableSelect
      name={name}
      isMulti={isMulti}
      isClearable
      isDisabled={isLoading}
      isLoading={isLoading}
      allowCreateWhileLoading={true}
      createOptionPosition="first"
      onCreateOption={handleCreate}
      onChange={(newValue: any) => handleChange(newValue)}
      options={selectedOptions}
      value={value}
      closeMenuOnSelect={!isMulti}
      classNames={{
        control: (state) => "border-0",
        container: (state) =>
          "w-full items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      }}
      placeholder={placeholder || "Select or create"}
    />
  );
}
