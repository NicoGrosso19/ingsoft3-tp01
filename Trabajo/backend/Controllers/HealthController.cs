using Microsoft.AspNetCore.Mvc;

namespace SistemaReservasBackend.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult GetHealth()
    {
        return Ok(new
        {
            status = "OK",
            message = "API de Reservas y Turnos funcionando (.NET 8)"
        });
    }
}
