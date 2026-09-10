using System.Threading.Tasks;

namespace AdpovCopilot.Services;

/// <summary>
/// Interface for input validation
/// </summary>
public interface IValidationService
{
    Task<bool> ValidateInputAsync(string input);
    string SanitizeInput(string input);
}

/// <summary>
/// Validation Service - validates and sanitizes user input
/// </summary>
public class ValidationService : IValidationService
{
    private readonly ILogger<ValidationService> _logger;
    private const int MaxInputLength = 10000;
    private const int MinInputLength = 1;

    public ValidationService(ILogger<ValidationService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Validate user input
    /// </summary>
    public async Task<bool> ValidateInputAsync(string input)
    {
        try
        {
            // Check if input is null or empty
            if (string.IsNullOrWhiteSpace(input))
            {
                _logger.LogWarning("Input validation failed: empty input");
                return false;
            }

            // Check length
            if (input.Length < MinInputLength || input.Length > MaxInputLength)
            {
                _logger.LogWarning("Input validation failed: length {Length} not in range [{Min}, {Max}]",
                    input.Length, MinInputLength, MaxInputLength);
                return false;
            }

            // Check for malicious content
            if (ContainsSuspiciousPatterns(input))
            {
                _logger.LogWarning("Input validation failed: suspicious patterns detected");
                return false;
            }

            return await Task.FromResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating input");
            return false;
        }
    }

    /// <summary>
    /// Sanitize user input
    /// </summary>
    public string SanitizeInput(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        // Remove extra whitespace
        var sanitized = System.Text.RegularExpressions.Regex.Replace(input, @"\s+", " ").Trim();

        // Truncate if too long
        if (sanitized.Length > MaxInputLength)
            sanitized = sanitized.Substring(0, MaxInputLength);

        return sanitized;
    }

    /// <summary>
    /// Check for suspicious patterns
    /// </summary>
    private bool ContainsSuspiciousPatterns(string input)
    {
        // Add pattern checks as needed
        // Example: SQL injection, script injection, etc.
        return false;
    }
}
