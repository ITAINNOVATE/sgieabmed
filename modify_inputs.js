const fs = require('fs');
const file = 'src/app/dashboard/receptions/new/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const defs = `
import React from 'react';

const UppercaseInput = React.forwardRef(({ onChange, className, ...props }, ref) => (
  <Input
    ref={ref}
    className={\`uppercase \${className || ''}\`}
    onChange={(e) => {
      e.target.value = e.target.value.toUpperCase();
      if (onChange) onChange(e);
    }}
    {...props}
  />
));
UppercaseInput.displayName = 'UppercaseInput';

const UppercaseTextarea = React.forwardRef(({ onChange, className, ...props }, ref) => (
  <Textarea
    ref={ref}
    className={\`uppercase \${className || ''}\`}
    onChange={(e) => {
      e.target.value = e.target.value.toUpperCase();
      if (onChange) onChange(e);
    }}
    {...props}
  />
));
UppercaseTextarea.displayName = 'UppercaseTextarea';

`;

if (!content.includes('UppercaseInput')) {
  content = content.replace('export default function NewReceptionPage() {', defs + 'export default function NewReceptionPage() {');
}

content = content.replace(/<Textarea/g, '<UppercaseTextarea');

content = content.replace(/<Input /g, '<UppercaseInput ');
content = content.replace(/<UppercaseInput type="date"/g, '<Input type="date"');
content = content.replace(/<UppercaseInput type="time"/g, '<Input type="time"');
content = content.replace(/<UppercaseInput type="number"/g, '<Input type="number"');

// Using backticks to avoid escaping issues
content = content.replace(/<Input type="date"/g, `<Input type="date" onKeyDown={(e) => e.preventDefault()} onClick={(e) => 'showPicker' in e.currentTarget && (e.currentTarget).showPicker()}`);

fs.writeFileSync(file, content);
console.log('Done');
