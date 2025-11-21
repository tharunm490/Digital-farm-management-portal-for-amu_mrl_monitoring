const fs = require('fs');
const data = JSON.parse(fs.readFileSync('dosage_reference_full_extended.json', 'utf8'));

console.log('=== MEDICINES AND CATEGORIES BY SPECIES ===\n');

const species = ['cow', 'goat', 'sheep', 'pig', 'chicken'];

species.forEach(speciesName => {
  console.log(`## ${speciesName.toUpperCase()}`);

  if (data[speciesName]) {
    const categories = data[speciesName];
    const categoryLabels = {
      'anti-inflammatory': 'Anti-inflammatory',
      'antibiotic': 'Antibiotic',
      'anticoccidial': 'Anticoccidial',
      'antiparasitic': 'Antiparasitic',
      'hormonal': 'Hormonal',
      'nsaid': 'NSAID',
      'vaccine': 'Vaccine',
      'vitamin': 'Vitamin'
    };

    Object.keys(categories).forEach(categoryKey => {
      const category = categories[categoryKey];
      const medicinesForSpecies = [];

      Object.keys(category).forEach(medicineName => {
        medicinesForSpecies.push(medicineName);
      });

      if (medicinesForSpecies.length > 0) {
        const label = categoryLabels[categoryKey] || categoryKey;
        console.log(`### ${label} (${medicinesForSpecies.length} medicines)`);
        medicinesForSpecies.forEach(med => console.log(`- ${med}`));
        console.log('');
      }
    });
  }

  console.log('');
});