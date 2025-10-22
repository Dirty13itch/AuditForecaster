import { useState } from 'react';
import ChecklistItem from '../ChecklistItem';

export default function ChecklistItemExample() {
  const [items, setItems] = useState([
    { id: '1', itemNumber: 1, title: 'Verify all ductwork is properly sealed at joints', completed: true, notes: 'All joints sealed with mastic', photoCount: 3 },
    { id: '2', itemNumber: 2, title: 'Check for proper insulation R-value in attic spaces', completed: false, notes: '', photoCount: 0 },
    { id: '3', itemNumber: 3, title: 'Inspect HVAC unit installation and clearances', completed: false, notes: 'Need to verify clearances tomorrow', photoCount: 2 },
  ]);

  const handleToggle = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
    console.log('Toggled item:', id);
  };

  const handleNotesChange = (id: string, notes: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, notes } : item
    ));
    console.log('Notes updated:', id, notes);
  };

  return (
    <div className="space-y-4 p-4 max-w-2xl">
      {items.map(item => (
        <ChecklistItem
          key={item.id}
          {...item}
          onToggle={handleToggle}
          onNotesChange={handleNotesChange}
          onPhotoAdd={(id) => console.log('Add photo for:', id)}
        />
      ))}
    </div>
  );
}
