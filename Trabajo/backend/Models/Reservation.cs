using System.Text.Json.Serialization;

namespace SistemaReservasBackend.Models;

public class Reservation
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("userName")]
    public string UserName { get; set; } = string.Empty;

    [JsonPropertyName("userEmail")]
    public string UserEmail { get; set; } = string.Empty;

    [JsonPropertyName("dateTime")]
    public string DateTime { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "PENDIENTE";

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = System.DateTime.UtcNow.ToString("o");
}
