using Microsoft.AspNetCore.Mvc;
using SistemaReservasBackend.DTOs;
using SistemaReservasBackend.Services;

namespace SistemaReservasBackend.Controllers;

[ApiController]
[Route("api/reservations")]
public class ReservationsController : ControllerBase
{
    private readonly IReservationService _reservationService;

    public ReservationsController(IReservationService reservationService)
    {
        _reservationService = reservationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetReservations()
    {
        var (statusCode, response) = await _reservationService.GetReservationsAsync();
        return StatusCode(statusCode, response);
    }

    [HttpPost]
    public async Task<IActionResult> CreateReservation([FromBody] CreateReservationDto dto)
    {
        var (statusCode, response) = await _reservationService.CreateReservationAsync(dto);
        return StatusCode(statusCode, response);
    }

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
    {
        var (statusCode, response) = await _reservationService.UpdateStatusAsync(id, dto);
        return StatusCode(statusCode, response);
    }
}
