using DotNetEnv;
using SistemaReservasBackend.Services;

// Cargar variables de entorno desde .env si existe en el directorio de trabajo
try
{
    var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
    if (File.Exists(envPath))
    {
        Env.Load(envPath);
    }
}
catch
{
    // Continuar si no se pudo cargar el archivo .env
}

var builder = WebApplication.CreateBuilder(args);

// Configurar puerto de escucha leyendo de variable PORT (default 3000)
var portStr = Environment.GetEnvironmentVariable("PORT") ?? "3000";
if (!int.TryParse(portStr, out var port))
{
    port = 3000;
}
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// Registrar Servicios
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddScoped<IReservationService, ReservationService>();

// Configurar CORS para permitir comunicación con el Frontend React
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
