const fs = require('fs');
const file = 'src/app/dashboard/receptions/new/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<SelectContent>\s*<SelectItem value="Antibiotiques">Antibiotiques<\/SelectItem>[\s\S]*?<SelectItem value="Autres">Autres<\/SelectItem>\s*<\/SelectContent>/g;

const newSelectContent = `<SelectContent>
                                  <SelectItem value="Analgésiques / Antipyrétiques">Analgésiques / Antipyrétiques</SelectItem>
                                  <SelectItem value="Anti-inflammatoires">Anti-inflammatoires</SelectItem>
                                  <SelectItem value="Antibiotiques / Antibactériens">Antibiotiques / Antibactériens</SelectItem>
                                  <SelectItem value="Antifongiques">Antifongiques</SelectItem>
                                  <SelectItem value="Antiviraux">Antiviraux</SelectItem>
                                  <SelectItem value="Antiparasitaires / Antipaludéens">Antiparasitaires / Antipaludéens</SelectItem>
                                  <SelectItem value="Antihypertenseurs">Antihypertenseurs</SelectItem>
                                  <SelectItem value="Antidiabétiques">Antidiabétiques</SelectItem>
                                  <SelectItem value="Antihistaminiques">Antihistaminiques</SelectItem>
                                  <SelectItem value="Gastro-entérologie">Gastro-entérologie</SelectItem>
                                  <SelectItem value="Vitamines et Suppléments">Vitamines et Suppléments</SelectItem>
                                  <SelectItem value="Vaccins et Sérums">Vaccins et Sérums</SelectItem>
                                  <SelectItem value="Anesthésiques">Anesthésiques</SelectItem>
                                  <SelectItem value="Corticoïdes">Corticoïdes</SelectItem>
                                  <SelectItem value="Psychotropes / Neurologie">Psychotropes / Neurologie</SelectItem>
                                  <SelectItem value="Dispositifs médicaux / Consommables">Dispositifs médicaux / Consommables</SelectItem>
                                  <SelectItem value="Autres">Autres</SelectItem>
                                </SelectContent>`;

content = content.replace(regex, newSelectContent);

fs.writeFileSync(file, content);
console.log('Category select content replaced.');
