export const STORY = {
  storyTitle: "Realm of Radiance: The Grumble Curse",
  prologue:
    "In the sparkling kingdom of Lumaria, a vain wizard named Grumblewick cast the Grumble Spell, turning gentle creatures into grumpy troublemakers. Now eight brave princesses must zoom across the sky to un-grumble everyone and restore the sparkle!",
  waves: [
    {
      title: "Grumbly Goblins & Batty Buddies",
      introDialogue: "Ready your sparkles — grumpy goblins incoming!",
    },
    {
      title: "Fairy Dust Gone Wrong",
      introDialogue: "Oh no, even the fairies got zapped!",
    },
    {
      title: "Troll Trouble Begins",
      introDialogue: "Big, mossy, and grumbling — here come the trolls!",
    },
    {
      title: "Storm of Shadows",
      introDialogue: "The shadows are thick, but our sparkle is brighter!",
    },
    {
      title: "Dragon's Roar",
      introDialogue: "A dragon roars — time to show this curse who's boss!",
    },
    {
      title: "The Final Grumble Charge",
      introDialogue: "Everything grumpy is charging — let's light it up!",
    },
  ],
  stages: [
    {
      name: "The Enchanted Meadows",
      boss: {
        name: "Captain Grumblegut",
        title: "The Grumpy Goblin General",
        introDialogue: "Halt! I command... whoa, my sword!",
        defeatDialogue: "Ow! Fine, I yield! Watch your step, too!",
        description:
          "A round goblin in oversized armor who trips over his own sword",
        color: "#5B8C3E",
        accentColor: "#8B4513",
      },
    },
    {
      name: "The Shadow Highlands",
      boss: {
        name: "Lady Gloomweave",
        title: "The Dramatic Shadow Fairy",
        introDialogue: "You dare upstage MY tragic shadow show?!",
        defeatDialogue: "Sob! My glitter tears... how could you win!",
        description:
          "A theatrical dark fairy who cries glitter tears when upset",
        color: "#4B0082",
        accentColor: "#9370DB",
      },
    },
    {
      name: "Grumblewick's Tower",
      boss: {
        name: "Lord Grumblewick",
        title: "The Vain Wizard of Grumbles",
        introDialogue: "You stole my spotlight! Now everyone grumbles!",
        defeatDialogue: "Fine, FINE! Un-grumbling everyone...",
        description:
          "A vain wizard with an enormous cape who just wanted attention",
        color: "#8B0000",
        accentColor: "#FFD700",
      },
    },
  ],
  // Kept for backwards compatibility with existing code paths.
  boss: {
    name: "Lord Grumblewick",
    introDialogue: "You stole my spotlight! Now everyone grumbles like ME!",
    defeatDialogue: "Fine, FINE! Un-grumbling everyone... my cape was fabulous!",
  },
  epilogue:
    "The Grumble Spell shatters! Every creature bursts back into giggles and glow. Lumaria sparkles brighter than ever!",
  characterQuotes: {
    Aurora: "Golden sparkles, light the way!",
    Luna: "Feel my frost — dragon magic fills the air!",
    Stella: "Wings like wind, watch me fly!",
    Rose: "Flames of courage — phoenix power!",
    Elara: "Graceful glide, feathers gleam!",
    Ivy: "Wolf and vine, forest's call!",
    Coral: "Ride the tide, dolphin's song!",
    Violet: "Butterfly dust swirls — magic wins!",
  } as Record<string, string>,
};
