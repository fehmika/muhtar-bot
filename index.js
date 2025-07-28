
import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
} from "discord.js";

import cron from "node-cron";
import { mesajlar } from "./mesajlar.js";
import { ovmeler } from "./ovmeler.js";
import { dogrulukSorulari, cesaretSorulari } from "./dcSorular.js";
import { quizSorulari } from "./quizSorular.js";
import { kartlar } from "./kartlar.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`✅ Muhtar aktif! ${client.user.tag}`);
});

// === Günlük Otomatik Mesaj ===
cron.schedule("45 3 * * *", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const kanal = await guild.channels.fetch(process.env.KANAL_ID);
    const members = await guild.members.fetch();
    const aktifUyeler = members.filter((m) => !m.user.bot);

    if (aktifUyeler.size === 0) return;

    const rastgele = aktifUyeler.random();
    const mesaj = mesajlar[Math.floor(Math.random() * mesajlar.length)].replace(
      /{user}/g,
      `<@!${rastgele.user.id}>`
    );

    kanal.send(mesaj);
  } catch (err) {
    console.error("Cron hatası:", err.message);
  }
});

const rusRuletiOyunlari = new Map();
const quizOyunlari = new Map();

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const args = message.content.trim().split(/\s+/);
  const komut = args[0].toLowerCase();

  // === !yardım ===
  if (komut === "!yardım") {
    const embed = new EmbedBuilder()
      .setTitle("📜 Komutlar")
      .setDescription(
        "`!yardım` - Komut listesini gösterir\n" +
        "`!istatistik` - Üye sayısını gösterir\n" +
        "`!öv` - Kendini övdür 😄\n" +
        "`!dc` - Doğruluk/Cesaret sorusu sorar 🎲\n" +
        "`!quiz` - Mini quiz oyunu başlatır 🎓\n" +
        "`!kartçek` - Rastgele bir kart çeker 🃏\n" +
        "`!rusruleti` - Tek veya iki kişilik Rus ruleti oynar 🔫"
      )
      .setColor("#0099ff");
    return message.channel.send({ embeds: [embed] });
  }

  // === !istatistik ===
  if (komut === "!istatistik") {
    const members = await message.guild.members.fetch();
    const total = members.size;
    const aktif = members.filter((m) => !m.user.bot).size;

    return message.channel.send(
      `📊 Toplam üye: ${total}\n👥 Aktif (bot olmayan) üye: ${aktif}`
    );
  }

  // === !öv ===
  if (komut === "!öv") {
    const mesaj = ovmeler[Math.floor(Math.random() * ovmeler.length)].replace(
      /{user}/g,
      `<@!${message.author.id}>`
    );
    return message.channel.send(mesaj);
  }

  // === !dc ===
  if (komut === "!dc") {
    const tur = Math.random() < 0.5 ? "Doğruluk" : "Cesaret";
    const soruListesi = tur === "Doğruluk" ? dogrulukSorulari : cesaretSorulari;
    const soru = soruListesi[Math.floor(Math.random() * soruListesi.length)];

    return message.channel.send(`🎲 **${tur}** sorusu: ${soru}`);
  }

  // === !quiz ===
  if (komut === "!quiz") {
    if (quizOyunlari.has(message.author.id)) {
      return message.channel.send("Zaten bir quiz oyunundasın! Cevap ver.");
    }

    quizOyunlari.set(message.author.id, { soruIndex: 0, puan: 0 });
    const soruObj = quizSorulari[0];

    const embed = new EmbedBuilder()
      .setTitle("🎓 Quiz Başladı!")
      .setDescription(
        `Soru 1: ${soruObj.soru}\n` +
        soruObj.cevaplar
          .map((c, i) => `**${String.fromCharCode(65 + i)}.** ${c}`)
          .join("\n")
      )
      .setFooter({ text: "Cevabını A, B, C veya D olarak yaz." })
      .setColor("#00ff00");

    return message.channel.send({ embeds: [embed] });
  }

  // === Quiz cevap ===
  if (quizOyunlari.has(message.author.id)) {
    const oyun = quizOyunlari.get(message.author.id);
    const cevap = message.content.toUpperCase();

    if (!["A", "B", "C", "D"].includes(cevap)) return;

    const soruObj = quizSorulari[oyun.soruIndex];
    const cevapIndex = cevap.charCodeAt(0) - 65;

    if (cevapIndex === soruObj.dogru) {
      oyun.puan++;
      await message.channel.send(`✅ Doğru! Puanın: ${oyun.puan}`);
    } else {
      await message.channel.send(
        `❌ Yanlış! Doğru cevap: **${String.fromCharCode(65 + soruObj.dogru)}. ${soruObj.cevaplar[soruObj.dogru]}**`
      );
    }

    oyun.soruIndex++;
    if (oyun.soruIndex >= quizSorulari.length) {
      await message.channel.send(
        `🎉 Quiz bitti! Toplam puanın: ${oyun.puan}/${quizSorulari.length}`
      );
      quizOyunlari.delete(message.author.id);
    } else {
      const sonraki = quizSorulari[oyun.soruIndex];
      const embed = new EmbedBuilder()
        .setTitle(`🎓 Soru ${oyun.soruIndex + 1}`)
        .setDescription(
          `${sonraki.soru}\n` +
          sonraki.cevaplar
            .map((c, i) => `**${String.fromCharCode(65 + i)}.** ${c}`)
            .join("\n")
        )
        .setColor("#00ff00")
        .setFooter({ text: "Cevabını A, B, C veya D olarak yaz." });

      await message.channel.send({ embeds: [embed] });
    }
    return;
  }

  // === !kartçek ===
  if (komut === "!kartçek") {
    const kart = kartlar[Math.floor(Math.random() * kartlar.length)];
    const embed = new EmbedBuilder()
      .setTitle(`🃏 ${kart.isim}`)
      .setDescription(kart.anlam)
      .setColor("#FFD700");
    return message.channel.send({ embeds: [embed] });
  }

  // === !rusruleti ===
  if (komut === "!rusruleti") {
    const hedef = message.mentions.users.first();

    if (!hedef) {
      const silindir = [false, false, false, false, false, true];
      silindir.sort(() => Math.random() - 0.5);

      await message.channel.send(`🔫 ${message.author.username} tetiği çekiyor...`);
      await new Promise((r) => setTimeout(r, 2000));

      if (silindir[0]) {
        return message.channel.send(`💥 BOOM! ${message.author.username} kaybetti...`);
      } else {
        return message.channel.send(`😅 Şanslısın ${message.author.username}, silah boştu.`);
      }
    }

    if (hedef.id === message.author.id) {
      return message.channel.send("Kendinle oynayamazsın.");
    }

    const key = `${message.channel.id}-${message.author.id}-${hedef.id}`;
    if (rusRuletiOyunlari.has(key)) {
      return message.channel.send("Bu oyuncular arasında zaten bir oyun başlatıldı.");
    }

    rusRuletiOyunlari.set(key, { status: "bekleniyor" });

    await message.channel.send(
      `🔫 ${hedef}, ${message.author} seninle Rus ruleti oynamak istiyor!\nKabul ediyorsan **evet** yaz (30 saniye içinde).`
    );

    const filter = (m) =>
      m.author.id === hedef.id && m.content.toLowerCase() === "evet";

    try {
      const onay = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ["time"] });

      await message.channel.send(`🎮 Oyun başlıyor: ${message.author.username} vs ${hedef.username}!`);

      const silindir = [false, false, false, false, false, true];
      silindir.sort(() => Math.random() - 0.5);

      const oyuncular = [message.author, hedef];
      let tur = 0;

      for (let i = 0; i < silindir.length; i++) {
        const oyuncu = oyuncular[tur % 2];

        await message.channel.send(`🔁 ${oyuncu.username} tetiği çekiyor...`);
        await new Promise((r) => setTimeout(r, 2000));

        if (silindir[i]) {
          await message.channel.send(`💥 BOOM! ${oyuncu.username} vuruldu! Oyun bitti.`);
          break;
        } else {
          await message.channel.send(`😌 Tetiği çekti ama silah boştu.`);
        }

        tur++;
      }
    } catch (err) {
      await message.channel.send("⌛ Zaman doldu. Oyun iptal edildi.");
    } finally {
      rusRuletiOyunlari.delete(key);
    }
  }
});

client.login(process.env.TOKEN);
