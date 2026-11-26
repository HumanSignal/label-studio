import { useAPI } from "@humansignal/core";
import { Message } from "@humansignal/ui";

export const FormError = () => {
  const { error, errorFormatter } = useAPI();

  if (!error) return null;

  const { message, validation = [] } = errorFormatter(error);
  const details = validation.flatMap(([, messages]) => ([] as string[]).concat(messages));
  const lines = details.length > 0 ? details : [message];

  return (
    <Message variant="negative" className="mt-base" data-testid="storage-form-error">
      {lines.length === 1 ? (
        lines[0]
      ) : (
        <ul className="m-0 pl-base">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </Message>
  );
};
