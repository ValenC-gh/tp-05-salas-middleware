const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const morgan = require("morgan");
const path = require("node:path");

const PORT = 3000;

const salasPermitidas = ["Sala Azul", "Sala Verde", "Sala Estudio"];
const turnosPermitidos = ["Mañana", "Tarde", "Noche"];

const reservas = [
  {
    id: 1,
    estudiante: "Lucía Fernández",
    email: "lucia@correo.com",
    sala: "Sala Azul",
    fecha: "2026-06-02",
    turno: "Mañana",
    personas: 2,
  },
  {
    id: 2,
    estudiante: "Mateo Ríos",
    email: "mateo@correo.com",
    sala: "Sala Verde",
    fecha: "2026-06-02",
    turno: "Tarde",
    personas: 4,
  },
  {
    id: 3,
    estudiante: "Sofía Benítez",
    email: "sofia@correo.com",
    sala: "Sala Estudio",
    fecha: "2026-06-03",
    turno: "Noche",
    personas: 1,
  },
  {
    id: 4,
    estudiante: "Tomás Aguirre",
    email: "tomas@correo.com",
    sala: "Sala Azul",
    fecha: "2026-06-03",
    turno: "Tarde",
    personas: 5,
  },
];

let numeroDeSolicitud = 0;

function identificarSolicitud(req, res, next) {
  numeroDeSolicitud += 1;
  res.locals.solicitudId = `BIB-${String(numeroDeSolicitud).padStart(4, "0")}`;
  next();
}

function medirDuracion(req, res, next) {
  const inicio = process.hrtime.bigint();

  res.on("finish", () => {
    const fin = process.hrtime.bigint();
    const milisegundos = Number(fin - inicio) / 1_000_000;

    console.log(
      `[${res.locals.solicitudId}] ${req.method} ${req.originalUrl} ` +
        `${res.statusCode} ${milisegundos.toFixed(2)} ms`
    );
  });

  next();
}

function prepararAreaReservas(req, res, next) {
  res.locals.seccion = "Reservas de salas";
  next();
}

function validarReserva(req, res, next) {
  const estudiante = String(req.body.estudiante ?? "").trim();
  const email = String(req.body.email ?? "").trim();
  const sala = String(req.body.sala ?? "").trim();
  const fecha = String(req.body.fecha ?? "").trim();
  const turno = String(req.body.turno ?? "").trim();
  const personas = Number(req.body.personas);

  const hayError =
    !estudiante ||
    !email.includes("@") ||
    !salasPermitidas.includes(sala) ||
    !fecha ||
    !turnosPermitidos.includes(turno) ||
    !Number.isInteger(personas) ||
    personas < 1 ||
    personas > 6;

  if (hayError) {
    return res.status(400).render("reservas/nueva", {
      titulo: "Nueva reserva",
      error: "Revisá los datos: todos los campos son obligatorios y deben ser válidos.",
      valores: req.body,
    });
  }

  req.reservaValidada = { estudiante, email, sala, fecha, turno, personas };
  next();
}

async function main() {
  const app = express();

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "../views"));

  app.use(morgan("dev"));
  app.use(identificarSolicitud);
  app.use(medirDuracion);

  app.use(expressLayouts);
  app.set("layout", "layouts/main");

  app.use(express.static(path.join(__dirname, "../public")));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  app.get("/", (req, res) => {
    res.render("inicio", { titulo: "Reservas de salas de estudio" });
  });

  app.get("/estado", (req, res) => {
    res.json({
      servicio: "activo",
      reservas: reservas.length,
      solicitudId: res.locals.solicitudId,
    });
  });

  function crearReserva(req, res) {
    const ultimoId = reservas.reduce(
      (mayorId, reserva) => Math.max(mayorId, reserva.id),
      0
    );

    reservas.push({ id: ultimoId + 1, ...req.reservaValidada });
    res.redirect("/reservas");
  }

  const reservasRouter = express.Router();

  reservasRouter.use(prepararAreaReservas);

  reservasRouter.get("/", (req, res) => {
    res.render("reservas/lista", { titulo: "Reservas", reservas });
  });

  reservasRouter.get("/nueva", (req, res) => {
    res.render("reservas/nueva", {
      titulo: "Nueva reserva",
      error: null,
      valores: {},
    });
  });

  reservasRouter.get("/:id", (req, res) => {
    const id = Number(req.params.id);
    const reserva = reservas.find((elemento) => elemento.id === id);

    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "No existe una reserva con ese identificador.",
      });
    }

    res.render("reservas/detalle", {
      titulo: `Reserva de ${reserva.estudiante}`,
      reserva,
    });
  });

  reservasRouter.post("/", validarReserva, crearReserva);

  app.use("/reservas", reservasRouter);

  app.use((req, res) => {
    res.status(404).render("no-encontrado", {
      titulo: "Página no encontrada",
      mensaje: "La dirección solicitada no existe.",
    });
  });

  app.listen(PORT, () => {
    console.log(`Aplicación disponible en http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error("No se pudo iniciar la aplicación:", error);
  process.exitCode = 1;
});