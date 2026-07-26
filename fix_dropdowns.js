const fs = require('fs');
const file = 'src/app/dashboard/receptions/new/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace form input
const oldFormItem = `<FormField control={form.control} name={\`samples.\${index}.form\`} render={({ field }) => (
                          <FormItem><FormLabel className="text-xs font-semibold text-foreground/80">Forme</FormLabel><FormControl><UppercaseInput placeholder="Ex: Comprimé..." {...field} /></FormControl></FormItem>
                        )} />`;

const newFormItem = `<FormField control={form.control} name={\`samples.\${index}.form\`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-foreground/80">Forme</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                              <FormControl><SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="Comprimé">Comprimé</SelectItem>
                                <SelectItem value="Comprimé effervescent">Comprimé effervescent</SelectItem>
                                <SelectItem value="Comprimé pelliculé">Comprimé pelliculé</SelectItem>
                                <SelectItem value="Gélule">Gélule</SelectItem>
                                <SelectItem value="Capsule">Capsule</SelectItem>
                                <SelectItem value="Sirop">Sirop</SelectItem>
                                <SelectItem value="Suspension buvable">Suspension buvable</SelectItem>
                                <SelectItem value="Ampoule buvable">Ampoule buvable</SelectItem>
                                <SelectItem value="Solution injectable">Solution injectable</SelectItem>
                                <SelectItem value="Poudre pour préparation injectable">Poudre pour préparation injectable</SelectItem>
                                <SelectItem value="Pommade">Pommade</SelectItem>
                                <SelectItem value="Crème">Crème</SelectItem>
                                <SelectItem value="Gel">Gel</SelectItem>
                                <SelectItem value="Suppositoire">Suppositoire</SelectItem>
                                <SelectItem value="Ovule">Ovule</SelectItem>
                                <SelectItem value="Collyre">Collyre</SelectItem>
                                <SelectItem value="Gouttes">Gouttes</SelectItem>
                                <SelectItem value="Spray">Spray</SelectItem>
                                <SelectItem value="Sachet">Sachet</SelectItem>
                                <SelectItem value="Granulés">Granulés</SelectItem>
                                <SelectItem value="Patch transdermique">Patch transdermique</SelectItem>
                                <SelectItem value="Autres">Autres</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />`;

// Replace dosage input
const oldDosageItem = `<FormField control={form.control} name={\`samples.\${index}.dosage\`} render={({ field }) => (
                          <FormItem><FormLabel className="text-xs font-semibold text-foreground/80">Dosage</FormLabel><FormControl><UppercaseInput placeholder="Ex: 500mg..." {...field} /></FormControl></FormItem>
                        )} />`;

const newDosageItem = `<FormField control={form.control} name={\`samples.\${index}.dosage\`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-foreground/80">Dosage</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                              <FormControl><SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="1mg">1mg</SelectItem>
                                <SelectItem value="2mg">2mg</SelectItem>
                                <SelectItem value="2.5mg">2.5mg</SelectItem>
                                <SelectItem value="5mg">5mg</SelectItem>
                                <SelectItem value="10mg">10mg</SelectItem>
                                <SelectItem value="15mg">15mg</SelectItem>
                                <SelectItem value="20mg">20mg</SelectItem>
                                <SelectItem value="25mg">25mg</SelectItem>
                                <SelectItem value="30mg">30mg</SelectItem>
                                <SelectItem value="40mg">40mg</SelectItem>
                                <SelectItem value="50mg">50mg</SelectItem>
                                <SelectItem value="60mg">60mg</SelectItem>
                                <SelectItem value="75mg">75mg</SelectItem>
                                <SelectItem value="80mg">80mg</SelectItem>
                                <SelectItem value="100mg">100mg</SelectItem>
                                <SelectItem value="125mg">125mg</SelectItem>
                                <SelectItem value="150mg">150mg</SelectItem>
                                <SelectItem value="200mg">200mg</SelectItem>
                                <SelectItem value="250mg">250mg</SelectItem>
                                <SelectItem value="300mg">300mg</SelectItem>
                                <SelectItem value="400mg">400mg</SelectItem>
                                <SelectItem value="500mg">500mg</SelectItem>
                                <SelectItem value="600mg">600mg</SelectItem>
                                <SelectItem value="750mg">750mg</SelectItem>
                                <SelectItem value="800mg">800mg</SelectItem>
                                <SelectItem value="875mg">875mg</SelectItem>
                                <SelectItem value="1g">1g</SelectItem>
                                <SelectItem value="1.5g">1.5g</SelectItem>
                                <SelectItem value="2g">2g</SelectItem>
                                <SelectItem value="1mg/ml">1mg/ml</SelectItem>
                                <SelectItem value="2mg/ml">2mg/ml</SelectItem>
                                <SelectItem value="5mg/ml">5mg/ml</SelectItem>
                                <SelectItem value="10mg/ml">10mg/ml</SelectItem>
                                <SelectItem value="125mg/5ml">125mg/5ml</SelectItem>
                                <SelectItem value="250mg/5ml">250mg/5ml</SelectItem>
                                <SelectItem value="0.1%">0.1%</SelectItem>
                                <SelectItem value="0.5%">0.5%</SelectItem>
                                <SelectItem value="1%">1%</SelectItem>
                                <SelectItem value="2%">2%</SelectItem>
                                <SelectItem value="5%">5%</SelectItem>
                                <SelectItem value="100 UI">100 UI</SelectItem>
                                <SelectItem value="200 UI">200 UI</SelectItem>
                                <SelectItem value="400 UI">400 UI</SelectItem>
                                <SelectItem value="500 UI">500 UI</SelectItem>
                                <SelectItem value="1000 UI">1000 UI</SelectItem>
                                <SelectItem value="Autres">Autres</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />`;

content = content.replace(oldFormItem, newFormItem);
content = content.replace(oldDosageItem, newDosageItem);

fs.writeFileSync(file, content);
console.log("Dropdowns applied.");
