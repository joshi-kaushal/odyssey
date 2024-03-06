"use client"
import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Button } from './button';
import { AddTag } from '@/lib/prisma/tags';

interface SelectItem {
    id: string;
    label: string;
}

interface SelectProps {
    items: SelectItem[];
    onSelect: (item: SelectItem) => void;
}

const SearchableSelect: React.FC<SelectProps> = ({ items, onSelect }) => {
    const [filteredItems, setFilteredItems] = useState<SelectItem[]>(items);
    const [inputValue, setInputValue] = useState<string>('');
    const [showAddPrompt, setShowAddPrompt] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setFilteredItems(items);

    }, [items]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const searchTerm = e.target.value.toLowerCase();
        setInputValue(searchTerm);

        const filtered = items.filter(item =>
            item.label.toLowerCase().includes(searchTerm)
        );

        setFilteredItems(filtered);

        setShowAddPrompt(!filtered.length && searchTerm.length > 0);
    };

    const handleSelectItem = (item: SelectItem) => {
        setInputValue('');
        onSelect(item);
    };

    const handleAddNewItem = () => {
        if (inputValue.trim() !== '') {
            // Add new item to the array
            const newItem: SelectItem = {
                id: `label=${inputValue.trim()}`,
                label: inputValue.trim(),
            };

            onSelect(newItem);
            setInputValue('');

            const f = AddTag(inputValue.trim())
        }

        setShowAddPrompt(false);
    };

    return (
        <div className='flex gap-2'>
            <Input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Search or add new tag"
                ref={inputRef}
            />
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                    {filteredItems.map(item => (
                        <SelectItem key={item.id} value={item.label} onClick={() => handleSelectItem(item)}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {showAddPrompt && (
                <Button onClick={handleAddNewItem}>Add</Button>

            )}
        </div>
    );
};

export default SearchableSelect;
