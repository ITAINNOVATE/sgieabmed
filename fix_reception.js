const fs = require('fs');
const file = 'src/app/dashboard/receptions/new/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add \`validators\` state and \`onError\` function inside \`NewReceptionPage\`
const stateCode = `  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [validators, setValidators] = useState<{id: string, name: string}[]>([]);

  React.useEffect(() => {
    async function loadValidators() {
      const supabase = createClient();
      const { data } = await supabase.from('users').select('id, first_name, last_name').eq('is_active', true);
      if (data) {
        setValidators(data.map(u => ({ id: u.id, name: \`\${u.first_name} \${u.last_name}\` })));
      }
    }
    loadValidators();
  }, []);

  const onError = (errors: any) => {
    toast.error("Veuillez remplir tous les champs obligatoires en rouge.");
    console.error("Form validation errors:", errors);
  };
`;
content = content.replace('  const [isUploadingFile, setIsUploadingFile] = useState(false);', stateCode);

// 2. Change \`form.handleSubmit(onSubmit)\` to \`form.handleSubmit(onSubmit, onError)\` for the submit button
content = content.replace(/form\.handleSubmit\(onSubmit\)(?! className)/g, 'form.handleSubmit(onSubmit, onError)');


// 3. Update Category Select ("Classe Thérapeutique")
content = content.replace(/Catégorie/g, 'Classe Thérapeutique');

const oldItems = `                                  <SelectItem value="Antibiotiques">Antibiotiques</SelectItem>
                                  <SelectItem value="Antalgiques">Antalgiques</SelectItem>
                                  <SelectItem value="Anti-inflammatoires">Anti-inflammatoires</SelectItem>
                                  <SelectItem value="Antipaludiques">Antipaludiques</SelectItem>
                                  <SelectItem value="Antihypertenseurs">Antihypertenseurs</SelectItem>
                                  <SelectItem value="Antidiabétiques">Antidiabétiques</SelectItem>
                                  <SelectItem value="Vaccins">Vaccins</SelectItem>
                                  <SelectItem value="Produits biologiques">Produits biologiques</SelectItem>
                                  <SelectItem value="Dispositifs médicaux">Dispositifs médicaux</SelectItem>
                                  <SelectItem value="Produits vétérinaires">Produits vétérinaires</SelectItem>
                                  <SelectItem value="Compléments alimentaires">Compléments alimentaires</SelectItem>
                                  <SelectItem value="Autres">Autres</SelectItem>`;
const newItems = `                                  <SelectItem value="Analgésiques / Antipyrétiques">Analgésiques / Antipyrétiques</SelectItem>
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
                                  <SelectItem value="Autres">Autres</SelectItem>`;

// Desktop
content = content.split(oldItems).join(newItems);

// Mobile (less indentation)
const oldItemsMobile = oldItems.replace(/                                  /g, '                              ');
const newItemsMobile = newItems.replace(/                                  /g, '                              ');
content = content.split(oldItemsMobile).join(newItemsMobile);


// 4. Documents joints - Add a visible "Supprimer" text to the delete button
content = content.replace('className="h-6 w-6 text-destructive hover:bg-destructive/10"', 'className="h-6 px-2 text-destructive hover:bg-destructive/10 text-xs"');
content = content.replace('<X className="h-3.5 w-3.5" />', '<X className="h-3.5 w-3.5 mr-1" /> Supprimer');

// 5. Update Validator Name from Input to Select
const oldValidator = `<FormItem><FormLabel>Responsable validation</FormLabel><FormControl><UppercaseInput {...field} /></FormControl></FormItem>`;
const newValidator = `<FormItem>
                      <FormLabel>Responsable validation</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {validators.map(v => (
                            <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>`;
content = content.replace(oldValidator, newValidator);


fs.writeFileSync(file, content);
console.log('Modifications effectuées.');
