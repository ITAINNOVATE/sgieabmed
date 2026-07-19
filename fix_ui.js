const fs = require('fs');
const file = 'src/app/dashboard/receptions/new/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Rename "Brouillon" to "Sauvegarder"
content = content.replace(
  '<Button type="button" variant="secondary" onClick={onDraft}><Save className="mr-2 h-4 w-4" /> Brouillon</Button>',
  '<Button type="button" variant="secondary" onClick={onDraft}><Save className="mr-2 h-4 w-4" /> Sauvegarder</Button>'
);

// 2. Remove default "Autres" category
content = content.replace(
  'samples: [{ commercial_name: "", dci: "", category: "Autres", batch: "", exp_date: "", qty: 1 }],',
  'samples: [{ commercial_name: "", dci: "", category: "", batch: "", exp_date: "", qty: 1 }],'
);

content = content.replace(
  'onClick={() => append({ commercial_name: "", dci: "", category: "Autres", batch: "", exp_date: "", qty: 1 })}>\\n                <Plus className="mr-2 h-4 w-4" /> Ajouter un produit à cette réception',
  'onClick={() => append({ commercial_name: "", dci: "", category: "", batch: "", exp_date: "", qty: 1 })}>\\n                <Plus className="mr-2 h-4 w-4" /> Ajouter un produit à cette réception'
);
// In case the above append replacement fails due to newlines, try standard replace:
content = content.replace(
  '{ commercial_name: "", dci: "", category: "Autres", batch: "", exp_date: "", qty: 1 }',
  '{ commercial_name: "", dci: "", category: "", batch: "", exp_date: "", qty: 1 }'
);

// 3. Update Select defaultValue for Category (remove "Autres")
content = content.replace(/defaultValue=\{field\.value \|\| "Autres"\}/g, 'defaultValue={field.value || ""}');

// 4. Force mobile cards view everywhere and delete table view
// We need to find the table div and delete it, and remove md:hidden from the cards div.

// Let's use a regex to strip the table view if possible
const tableStart = '<div className="hidden md:block overflow-x-auto rounded-lg border border-border/50">';
const tableEnd = '</div>\\n\\n              {/* MOBILE CARDS VIEW */}';

// We'll just remove the hidden class from the mobile cards view
content = content.replace(
  '<div className="space-y-4 md:hidden">',
  '<div className="space-y-4">'
);

// Instead of complex regex for the table, we'll just add 'hidden' to it unconditionally 
// so it never shows up, or actually delete it to avoid duplicate FormField names causing issues!
// Duplicate FormField names in react-hook-form can cause issues, but they were already duplicate and worked because CSS hides one? 
// No, React-hook-form fields with same name register to the same input, which is fine but removing it is better.
const tableViewRegex = /<div className="hidden md:block overflow-x-auto rounded-lg border border-border\/50">[\s\S]*?<\/Table>\s*<\/div>/;
content = content.replace(tableViewRegex, '');


fs.writeFileSync(file, content);
console.log('UI Fixes Applied');
