const WORDS = [
  "lorem","ipsum","dolor","sit","amet","consectetur","adipiscing","elit","sed","do",
  "eiusmod","tempor","incididunt","ut","labore","et","dolore","magna","aliqua","enim",
  "ad","minim","veniam","quis","nostrud","exercitation","ullamco","laboris","nisi",
  "aliquip","ex","ea","commodo","consequat","duis","aute","irure","in","reprehenderit",
  "voluptate","velit","esse","cillum","fugiat","nulla","pariatur","excepteur","sint",
  "occaecat","cupidatat","non","proident","sunt","culpa","qui","officia","deserunt",
  "mollit","anim","id","est","blandit","volutpat","maecenas","accumsan","lacus","vel",
  "facilisis","volutpat","praesent","semper","feugiat","nibh","cras","adipiscing",
];

const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface LoremConfig {
  sentencesPerParagraph?: { min: number; max: number };
  wordsPerSentence?: { min: number; max: number };
}

export class LoremIpsum {
  private spp: { min: number; max: number };
  private wps: { min: number; max: number };

  constructor(config: LoremConfig = {}) {
    this.spp = config.sentencesPerParagraph ?? { min: 3, max: 5 };
    this.wps = config.wordsPerSentence ?? { min: 5, max: 12 };
  }

  generateWords(count: number): string {
    return Array.from({ length: count }, pick).join(" ");
  }

  generateSentences(count: number): string {
    return Array.from({ length: count }, () => {
      const len = rand(this.wps.min, this.wps.max);
      return capitalize(this.generateWords(len)) + ".";
    }).join(" ");
  }

  generateParagraphs(count: number): string {
    return Array.from({ length: count }, () => {
      const len = rand(this.spp.min, this.spp.max);
      return this.generateSentences(len);
    }).join("\n\n");
  }
}
