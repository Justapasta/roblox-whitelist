const express = require("express");
const { google } = require("googleapis");
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

const app = express();
const port = 3000;

// === Configuración del bot de Discord ===
const DISCORD_TOKEN = "MTM2Mjg4OTk0NzQxNzQxNTcxMA.GTA_Cl.VIuUrifNRviHHg0ctEHaQRs-kdBDlmYSYdfrnI";
const CLIENT_ID = "1362889947417415710";

// === Configuración de Google Sheets ===
const SHEET_ID = "1Er1IrzSalxWYSScgzwcrJNA6ZPknyXK9yNowN4zBUnY";
const SHEET_RANGE = "A2:A";

// === Autenticación con Google Sheets ===
const auth = new google.auth.GoogleAuth({
  keyFile: "google-credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

// === Bot de Discord ===
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName("whitelist")
    .setDescription("Agrega tu nombre de usuario de Roblox a la whitelist")
    .addStringOption(option =>
      option.setName("username")
        .setDescription("Tu nombre de usuario de Roblox")
        .setRequired(true)
    )
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Comando /whitelist registrado.");
  } catch (error) {
    console.error("Error al registrar el comando:", error);
  }
})();

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "whitelist") {
    // ✅ Solo se permite en el canal autorizado
    if (interaction.channelId !== "1362897314917646487") { // Asegúrate de usar la ID como cadena de texto
      await interaction.reply({
        content: "❌ Este comando solo puede usarse en el canal autorizado.",
        ephemeral: true
      });
      return;
    }

    const username = interaction.options.getString("username");

    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "A2",
        valueInputOption: "RAW",
        requestBody: {
          values: [[username]],
        },
      });

      await interaction.reply(`✅ ${username} ha sido agregado a la whitelist.`);
    } catch (error) {
      console.error("Error al agregar a la whitelist:", error);
      await interaction.reply("❌ Hubo un error al agregar a la whitelist.");
    }
  }
});


client.login(DISCORD_TOKEN);

// === API para Roblox ===
app.get("/whitelist", async (req, res) => {
  const username = (req.query.username || "").trim();
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE,
    });
    const values = response.data.values || [];
    const isWhitelisted = values.flat().includes(username);
    res.json({ whitelisted: isWhitelisted });
  } catch (error) {
    console.error("Error al consultar la whitelist:", error);
    res.status(500).json({ error: "Error al consultar la whitelist." });
  }
});

app.listen(port, () => {
  console.log(`🌐 API activa en http://localhost:${port}`);
});

// === API para Roblox (verificación de whitelist) ===
app.get("/whitelist", async (req, res) => {
  const username = (req.query.username || "").trim(); // Nombre de usuario de Roblox
  if (!username) {
    return res.status(400).json({ error: "Debe proporcionar un nombre de usuario." });
  }

  try {
    // Obtener los usuarios desde la hoja de cálculo
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "A2:A",  // Rango de las celdas que contienen los nombres de usuario
    });

    const values = response.data.values || [];
    const isWhitelisted = values.flat().includes(username); // Verifica si el nombre está en la whitelist

    // Responde con el resultado
    res.json({ whitelisted: isWhitelisted });
  } catch (error) {
    console.error("Error al consultar la whitelist:", error);
    res.status(500).json({ error: "Error al consultar la whitelist." });
  }
});
