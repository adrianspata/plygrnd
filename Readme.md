# Dark Interactive 3D Logo Landing Page
        
STARTPROMPT — PLYGRND LANDINGPAGE

Skapa en mörk, minimal landingpage med en interaktiv 3D-logga: “plygrnd.”

Vid första load:

Loggan börjar liten och centrerad.

Den roterar långsamt några varv på plats.

Därefter växer loggan i storlek med mjuk easing, som om kameran rör sig närmare.

Loggan ska alltid ligga i mitten av viewporten.

Vid scroll:

Loggan stannar i centrum.

Den fortsätter växa och roteras.

Scrollen ska kännas som att kameran närmar sig loggan och samtidigt glider längs ena sidan av den (parallax + perspektivförskjutning).

Rörelsen ska vara långsam, fysisk och kontinuerlig.

När användaren har scrollat ner till ett definierat läge:

Ett newsletter-formulär ska automatiskt fade in ovanpå eller i anslutning till loggan.

Ingen klick-trigger. Endast scroll-baserad timing.

Stil:

Nästan helt svart bakgrund.

Subtilt ljus på loggans kanter.

Inga onödiga UI-element.

All rörelse ska kännas kontrollerad, cinematic och levande.

Made with Floot.

# Instructions

For security reasons, the `env.json` file is not pre-populated — you will need to generate or retrieve the values yourself.  

For **JWT secrets**, generate a value with:  

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then paste the generated value into the appropriate field.  

For the **Floot Database**, download your database content as a pg_dump from the cog icon in the database view (right pane -> data -> floot data base -> cog icon on the left of the name), upload it to your own PostgreSQL database, and then fill in the connection string value.  

**Note:** Floot OAuth will not work in self-hosted environments.  

For other external services, retrieve your API keys and fill in the corresponding values.  

Once everything is configured, you can build and start the service with:  

```
npm install -g pnpm
pnpm install
pnpm vite build
pnpm tsx server.ts
```
