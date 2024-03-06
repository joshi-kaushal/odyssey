"use client"

import { useState } from 'react';
import CreatableSelect from 'react-select/creatable';

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
}

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? '#f5f5f5' : '#fff',
    borderColor: state.isFocused ? '#ccc' : '#ddd',
    borderRadius: '4px',
    padding: '0.8rem 1rem',
    fontSize: '14px',
    fontWeight: 'normal',
    color: '#333',
  }),
  option: (provided, state) => ({
    ...provided,
    color: state.isSelected ? '#fff' : '#333',
    backgroundColor: state.isSelected ? '#007bff' : state.isFocused ? '#f5f5f5' : '#fff',
  }),
  dropdownIndicator: (styles) => ({
    ...styles,
    color: '#ccc',
  }),
  menu: (styles) => ({
    ...styles,
    boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.1)',
  }),
}


export default function Multiselect({ name, placeholder, options = [], values = [], isMulti = false, onCreateOption }: MultiSelectProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedOptions, setSelectedOptions] = useState<Option[]>(options);
  const [value, setValue] = useState<Option[]>(values);

  const handleCreate = async (inputValue: string) => {
    setIsLoading(true);

    if (onCreateOption) {
      const newOption = await onCreateOption(inputValue);
      if (newOption) {
        setSelectedOptions((prev) => [...prev, newOption]);
        isMulti ?  setValue((prev) => (prev ? [...prev, newOption] : [newOption])) : setValue(newOption);
      }
    }

    setIsLoading(false);
  };

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
      onChange={(newValue) => setValue(newValue)}
      options={selectedOptions}
      value={value}
      closeMenuOnSelect={!isMulti}
      classNames={{
        control: (state) => "border-0",
        container: (state) =>"w-full items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      }}
      placeholder={placeholder || 'Select or create'}
    />
  );
}
